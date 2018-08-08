/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './watch_edit_execute_info_panel.html';

const app = uiModules.get('xpack/watcher');

app.directive('watchEditExecuteInfoPanel', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {},
    bindToController: true,
    controllerAs: 'watchEditExecuteInfoPanel',
    controller: class WatchEditExecuteInfoPanelController {
      constructor() {
      }
    }
  };
});
