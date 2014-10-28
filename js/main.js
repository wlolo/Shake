
var timeoutID;
_g=function(){
	return store.get('user');
}
_s = function(o){
	store.set('user', o);
}
$(function(){
	if(_g()){
		$('#menu').show();
		$('#login').hide();
		$('#menu_mobile').html(_g().userName+'('+_g().operator+')');
	}else{
		$('#login').show();
	}
	$('#login_save').on('click',function(event){
		event.stopPropagation();
		var mobile = $('#login_mobile').val();
		var pwd = $('#login_password').val();
		var operator = $('#operator').val();
		if(mobile && pwd){
			_s({userName:mobile,passWord:pwd,operator:operator});
			$('#login').hide();
			$('#menu_mobile').html(mobile);
			$('#menu').show();
			if(operator=='移动'){
				$.post('http://shake.sd.chinamobile.com/shake',
					{method:'loginDo',r:new Date().getTime(),mobile:mobile,password:pwd},
					function(json){
						if (json.status != "ok") {
							printMsg('登录', str, true);
						}else{
							chrome.cookies.getAll(
								{url:'http://shake.sd.chinamobile.com'},
								function(cookie){
									var _tmp = _g();
									_tmp['cookies']=cookie;
									_s(_tmp);
									$('#signIn').trigger('click');
							});
						}
					},'json');
			}else{
				$('#signIn').trigger('click');
			}
		}
		return false;
	});
	$('#signIn').on('click',function(event){
		if(_g().operator=='联通'){
			var request = $.ajax({
				url: 'http://17186.cn/ajax/account/staticLoginNew.action',
				type: "post",
				data: {'userName': _g().userName, 'passWord': _g().passWord},
				dataType: "json"
			}), 
			chained = request.then(function(str){
				var json = $.parseJSON(str);
				if(json.resultCode == 'ok'){
					return $.ajax({url:'http://17186.cn/ajax/operation/userCheckIn.action',
						type:'post',
						dataType:'json'
					});
				}else if(json.resultCode == 'noSDMobile'){
					return $.Deferred(function (deferred) {
						return deferred.reject('不是山东联通省内手机号');
					}).promise();
				}else if(json.resultCode =='101000'){
					return $.Deferred(function (deferred) {
						return deferred.reject(json.msg);
					}).promise();
				}else if(json.resultCode=='validCodeIsNull'){
					return $.Deferred(function (deferred) {
						return deferred.reject('验证码为空');
					}).promise();
				}
			});
			//签到后
			chained.then(function(str){
				if(str != null && $.trim(str) != ''){
					printMsg('签到', str);
				}
			},function(str){
				printMsg('签到', str, true);
			});
			chained.then(function(){
				function shake(){
					$.post('http://17186.cn/ajax/lottery/shakePrize.action',function(json){
						if(typeof json == 'string'){
							json = $.parseJSON(json);
						}
						if(json && json.code != '10002'){
							printMsg('摇一摇', json.message);
							timeoutID = setTimeout(shake,500);
						}else{
							printMsg('摇一摇', '今天机会用完了', true);
							clearTimeout(timeoutID);
						}
					},'json');
				}
				timeoutID = setTimeout(shake,500);
			});
		}else{
			//TODO 多用户
			$.each(['loginToken_encrypt','nickName_encrypt','prov_wap_encrypt','userSign_wap_encrypt'],function(idx,name){
				chrome.cookies.remove({url: 'http://shake.sd.chinamobile.com',name: name}, function(result){});
			});
			var _cookies = _g().cookies;
			$.each(_cookies, function(idx,cookie){
				var new_cookie = {
					url: 'http://'+cookie.domain,
					name: cookie.name,
					value: cookie.value,
					secure: cookie.secure,
					httpOnly: cookie.httpOnly,
					expirationDate: cookie.expirationDate
				};
				chrome.cookies.set(new_cookie, function(){});
			});
			$.getJSON('http://shake.sd.chinamobile.com/shake',
				{method: 'loadLoginMobile', r: new Date().getTime()},
				function(data) {
					if (data.status != "ok") {
						printMsg('登录', str, true);
						$('#login').show();
						$('#menu').hide();
						$('#login_mobile').val(_g().userName);
						$('#menu a').eq(1).trigger('click');
					}
					if(data.result.loginMobile){
						function shake(){
							$.post('http://shake.sd.chinamobile.com/shake',
								{method:'draw',r:new Date().getTime()},function(json){
								if(json && json.message =='ok'){
									printMsg('摇一摇', json.result.winName||'未中奖');
									timeoutID = setTimeout(shake,500);
								}else{
									printMsg('摇一摇', '今天机会用完了', true);
									clearTimeout(timeoutID);
								}
							},'json');
						}
						timeoutID = setTimeout(shake,500);
					}
			});
		}

	});
	$('#quit').on('click', function(){
		store.remove('user');
		$('#menu_mobile').html('');
		$('#menu').hide();
		$('#login').show();
	});

	$('#menu a').on('click',function(){
		$("#menu li").removeClass('pure-menu-selected');
		$(this).closest('li').addClass('pure-menu-selected');
		$('#operator').val($(this).html());
		if($(this).html() == '移动'){
			$('#dynamicPwd').show();
		}else{
			$('#dynamicPwd').hide();
		}
	});
	//发送移动动态密码
	$('#dynamicPwd').on('click',function(){
		if($("#login_mobile").val()){
			$.post('http://shake.sd.chinamobile.com/shake',
				{method: 'getPassword',r: new Date().getTime(),mobile: $("#login_mobile").val()},
				function(json){
					if (json.status != "ok") {
						printMsg('登录', json.message, true);
					}else{
						printMsg('登录', '发送移动动态密码');
					}
				},'json');
		}
	});
	function printMsg(title, str, isRed){
		var _html = '<div class="pure-g">'+
					'	<div class="pure-u-1-8"><p>'+title+'</p></div>'+
					'	<div class="pure-u-1-2"><p>' +(isRed?'<em style="color:red;">':'')+str+(isRed?'</em>':'')+'</p></div>'+
					'</div>';
		$('#gird').append(_html);
	}
	$('login_mobile').focus();
});
