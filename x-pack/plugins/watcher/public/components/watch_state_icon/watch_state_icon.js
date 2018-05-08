/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './watch_state_icon.html';
import { WATCH_STATES } from 'plugins/watcher/../common/constants';

const app = uiModules.get('xpack/watcher');

app.directive('watchStateIcon', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      watchStatus: '='
    },
    bindToController: true,
    controllerAs: 'watchStateIcon',
    controller: class WatchStateIconController {
      constructor() {
        this.WATCH_STATES = WATCH_STATES;
      }
    }
  };
});
