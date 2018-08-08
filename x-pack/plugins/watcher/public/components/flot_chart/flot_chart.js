/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFunction, debounce } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './flot_chart.html';
import './flot_chart.less';
import $ from 'jquery-flot'; // webpackShim
import { FLOT_EVENT_PLOT_HOVER_DEBOUNCE_MS } from './constants';

const app = uiModules.get('xpack/watcher');

app.directive('flotChart', function () {
  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {

      // See https://github.com/flot/flot/blob/master/API.md#data-format
      data: '=',

      // See https://github.com/flot/flot/blob/master/API.md#plot-options
      options: '=',

      // Search for "plothover" in https://github.com/flot/flot/blob/master/API.md
      onPlotHover: '=',

    },
    controllerAs: 'flotChart',
    bindToController: true,
    link: ($scope, element) => {
      $scope.flotChart.container = element;
    },
    controller: class FlotChartController {
      constructor($scope) {

        $scope.$watchMulti([
          'flotChart.data',
          'flotChart.options'
        ], ([data, options]) => {
          this.plot = $.plot(this.container, data, options);
        });

        $scope.$watch('flotChart.onPlotHover', (onPlotHover) => {
          this.container.unbind('plothover');

          if (isFunction(onPlotHover)) {
            this.container.bind('plothover', debounce((...params) => {
              // We use $scope.$apply to tell Angular to trigger a digest whenever
              // the supplied event handler function is called
              $scope.$apply(() => onPlotHover(...params, this.plot));
            }, FLOT_EVENT_PLOT_HOVER_DEBOUNCE_MS));
          }
        });

        $scope.$on('$destroy', () => {
          this.container.unbind('plothover');
        });
      }
    }
  };
});
