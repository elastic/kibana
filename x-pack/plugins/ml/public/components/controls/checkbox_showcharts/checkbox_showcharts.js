/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for a checkbox element to toggle charts display.
 */

import { store } from '../../../redux/store';
import { showCharts } from '../../../redux/dispatchers';

import template from './checkbox_showcharts.html';
import 'plugins/ml/components/controls/controls_select';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .directive('mlCheckboxShowCharts', function () {
    return {
      restrict: 'E',
      template,
      scope: {
        visible: '='
      },
      link: function (scope) {
        scope.showCharts = store.getState().showCharts;
        scope.toggleChartsVisibility = () => showCharts(scope.showCharts);
      }
    };
  });
