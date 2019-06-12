/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import template from './toggle_panel.html';
import '../toggle_button';

const app = uiModules.get('xpack/watcher');

app.directive('togglePanel', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: template,
    scope: {
      togglePanelId: '@',
      buttonText: '@',
      isDisabled: '=',
      isCollapsed: '=',
      onToggle: '='
    },
    controllerAs: 'togglePanel',
    bindToController: true,
    controller: class TogglePanelController {
      toggle = () => {
        this.onToggle(this.togglePanelId);
      };
    }
  };
});
