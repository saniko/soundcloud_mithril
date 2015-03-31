(function(window, document) {

    "use strict";
	
	var config = {
		route_mode:'pathname',
		client_id: 'd652006c469530a4a7d6184b18e16c81',
	    version: '0.0.1',
		limit: 6,
		recent_length: 5
	}
	
	var animation = {
		fadesIn : function(element, isInitialized, context) {
		  if (!isInitialized) {
			element.style.opacity = 0;
			Velocity(element, {opacity: 1},{delay:400});
		  }

 },
	}
	
	function init(){
		SC.initialize({
			client_id: config.client_id
		});
	}
	
	init();
	
	
	var recentModule = {
	    recent : m.prop(), 
		load : function() {
			return JSON.parse(localStorage["recent"] || "[]");
		},
		add: function(val){
			if(val == "")
				return
			this.recent().unshift(val);
			if(config.recent_length == this.recent().length -1)
				this.recent().pop();
				
			localStorage["recent"] = JSON.stringify(this.recent())	
		},
		controller: function(){
		    var recentList = recentModule.load();
			recentModule.recent(recentList);
		},
		view: function(ctrl){
		       return [
				m("h2", "Recent Searches"),
				m("ul", 
				recentModule.recent().map(function(value, index){
				  return m("li", value)
				})
				)]
		}
	}
	
	var playModule = {
	    item : m.prop(),
		current: m.prop({track:m.prop(), id: m.prop()}),
		controller: function(){
		    /*--------------------stream the music-----------------
				click image to start/.stop.
				for some reason the widget does not appear
			*/
			this.play = function(){
			    var trackId = null;
				
				if(!playModule.current().id()){
					playModule.current().id( playModule.item().id);
				}
			    else if(playModule.current().id() == playModule.item().id){
				    var current = playModule.current().track();
					if(current.playState == 1)
						playModule.current().track().stop();
				    else
						playModule.current().track().play();
					return;
				} else {
					playModule.current().id( playModule.item().id)
					playModule.current().track().stop();
				    playModule.current().track(null)
				}
				
				trackId =  playModule.current().id();
				
				SC.stream("/tracks/" + trackId , function(sound){
					
					playModule.current().track(sound);
					playModule.current().track().play()

					})
		
        /* -------------for some reason the widget does not appear--------------------
		
		var track_url = playModule.current().track().url;		
			SC.oEmbed(track_url, { auto_play: true }, function(oEmbed) {
			  console.log('oEmbed response: ' + oEmbed);
			});		
		*/
			}
		},
		set: function(value){
			this.item(value)
		},
		view: function(ctrl){
		       var image_url = this.item() ? this.item().artwork_url : ""
		       return [
			   m("h2", "Play"),
			   m("div",[m("div",[m("img.play-imag.link[height='250'][src='" + image_url + "'][width='250']",{onclick: ctrl.play})])])]
			   
		
		}
	}
	
    /*--------------------Search Module-----------------
	 allow you to search the soundcloud API,
	 presents 6 results with pagination,
	 if no additional results the "next" button is disabled.
	 
	 click on any result, updates the "play" module
	*/
	var searchModule = {

		txt: m.prop(""),
		tracks:m.prop([]),
		viewMode:m.prop("list"),
		next_url:m.prop(false),
		controller: function(){
			this.select = function(value){
				playModule.set(value);
			}
		},
		load : function() {
			return JSON.parse(localStorage["viewMode"] || "[]");
		},
		toggleView: function(mode){
			this.viewMode(mode)
			localStorage["viewMode"] = JSON.stringify(mode)	
		},
		controller; function(){
		   var viewMode = searchModule.load();
		   searchModule.viewMode(viewMode || "list");
		},
		search: function (getNext, ev){
		    
			if(!searchModule.txt() && !getNext)
				return

			var url = getNext ? searchModule.next_url() : '/tracks';
			recentModule.add(this.txt());
			
			
			SC.get(url, 
				(getNext? "" : { q: this.txt(), linked_partitioning: 1, limit : config.limit  }), 
				function(res) {
					m.startComputation();
					
					if(res.next_href)
						searchModule.next_url(res.next_href)
					else
						searchModule.next_url(null);
						
					this.tracks(res.collection);   
					searchModule.txt("");
					
					m.endComputation()
				}.bind(this));
		
		},
		view: function(ctrl){
		        var viewMode = searchModule.viewMode();
				return [
				m("h2", "Search"),
				m("input[type=text]", {onchange: m.withAttr("value", searchModule.txt), value: searchModule.txt()}),
				m("button", { onclick: this.search.bind(this, false)}, "Search"),
					m(".search-list",
					[m(viewMode=="list"?"ul":"" ,
					  searchModule.tracks().map(function(value, index){
						if(viewMode == "list")
						  return m("li.link", {onclick: ctrl.select.bind(this, value)}, value.title)
						else
						 return m(".col-md-4.column.link", {onclick: ctrl.select.bind(this, value)},[m("img[height='100'][src='" + value.artwork_url + "'][width='100']")])
					})
					)]),
			
				m("button", { onclick: this.search.bind(this, true), disabled: searchModule.next_url() ? false : true}, "Next"),
				m("button.pull-right", { onclick: this.toggleView.bind(this, 'tile')}, "Tile"),
				m("button.pull-right", { onclick: this.toggleView.bind(this, 'list')}, "List"),
				]
			
		}
	}
	
	/*--------------------Footer view-----------------*/
	var footer = {
	  controller: function(){},
	  view: function(){
		return [m(".row.clearfix", [
					m(".col-md-12.column", [
						m("h2.page-header", "Footer")
					])
				])]
	  }
	};
	/*--------------------Header view-----------------*/
	var header = {
	  controller: function(){},
	  view: function(){
		return [m(".row.clearfix", [
				m(".col-md-12.column", [
					m("h2.page-header", "Search SoundCloud Music")
				])
			])]
	  }
	};
	
    /*--------------------App view-----------------*/
	function mainView(ctrl) {
		return m(".container", {
		}, [
		  m("header", header.view()),
		  m("main", contentView(ctrl)),
		  m("footer", footer.view())
		])
    }
	
    /*--------------------Main page view-----------------*/
	function contentView(ctrl) {
		return m(".row clearfix", {
		}, [
		  m(".col-md-4.column.s-panel", searchModule.view(ctrl.searchModule)),
		  m(".col-md-4.column.s-panel",   playModule.view(ctrl.playModule)),
		  m(".col-md-4.column.s-panel",  recentModule.view(ctrl.recentModule))
		])
    }
	
    var app = {};
	app.vm = {};
	app.controller = function() {
		this.searchModule = new searchModule.controller();
	    this.playModule = new playModule.controller();
		this.recentModule = new recentModule.controller();
	};
	app.view = function(ctrl) {
		return mainView(ctrl)
	};
	
	/*--------------------router-----------------*/
	m.route.mode = config.route_mode;
    m.route(document.body, '/', {
		'/': app,
	});
	
})(window, document);
