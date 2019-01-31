/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const $ = require('jquery');
if (window) { window.jQuery = $; }
require('ui/flot-charts/jquery.flot');

// load flot plugins
// avoid the `canvas` plugin, it causes blurry fonts
require('ui/flot-charts/jquery.flot.time');
require('ui/flot-charts/jquery.flot.crosshair');
require('ui/flot-charts/jquery.flot.selection');
module.exports = $;
