/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive+service for a checkbox element to toggle charts display.
 */

import { stateFactoryProvider } from 'plugins/ml/factories/state_factory';

import template from './checkbox_showcharts.html';
import 'plugins/ml/components/controls/controls_select';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .service('mlCheckboxShowChartsService', function (Private) {
    const stateFactory = Private(stateFactoryProvider);
    this.state = stateFactory('mlCheckboxShowCharts', {
      showCharts: true
    });
  })
  .directive('mlCheckboxShowCharts', function (mlCheckboxShowChartsService) {
    return {
      restrict: 'E',
      template,
      scope: {
        visible: '='
      },
      link: function (scope) {
        scope.showCharts = mlCheckboxShowChartsService.state.get('showCharts');
        scope.toggleChartsVisibility = function () {
          mlCheckboxShowChartsService.state.set('showCharts', scope.showCharts);
          mlCheckboxShowChartsService.state.changed();
        };
      }
    };
  });
