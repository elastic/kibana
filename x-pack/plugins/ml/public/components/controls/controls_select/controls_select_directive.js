/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering a select element with threshold levels.
 */

import template from './controls_select.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlControlsSelect', function () {
  return {
    restrict: 'E',
    scope: {
      identifier: '@',
      label: '@',
      narrowStyle: '=',
      options: '=',
      showIcons: '=',
      selected: '=',
      updateFn: '='
    },
    template,
    link: function (scope) {
      scope.setOption = function (d) {
        if (typeof scope.updateFn === 'function') {
          scope.updateFn(d);
        }
      };
    }
  };
});
