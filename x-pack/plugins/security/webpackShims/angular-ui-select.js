/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-var */
require('jquery');
require('angular');
require('angular-sanitize');
require('ui-select/dist/select');
require('ui-select/dist/select.css');

var uiModules = require('ui/modules').uiModules;
uiModules.get('kibana', ['ui.select', 'ngSanitize']);
