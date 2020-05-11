// TODO: This is bad. We aren't loading jQuery again, because Kibana already has, but we aren't really assured of that.
// That could change at any moment.

//import $ from 'jquery';
//if (window) window.jQuery = $;
require('./jquery.flot');
require('./jquery.flot.time');
require('./jquery.flot.canvas');
require('./jquery.flot.symbol');
require('./jquery.flot.crosshair');
require('./jquery.flot.selection');
require('./jquery.flot.stack');
require('./jquery.flot.threshold');
require('./jquery.flot.fillbetween');
//module.exports = $;
