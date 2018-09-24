/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './chart_tooltip.html';
import './chart_tooltip.less';

function calculateTooltipPosition(pointPosition, plotPosition, tooltipWidth, tooltipHeight) {

  const tooltipPosition = {
    top: get(pointPosition, 'top'),
    left: get(pointPosition, 'left')
  };

  const tooltipPositionBottom = pointPosition.top + tooltipHeight;
  const isTooltipBeyondPlotBottom = tooltipPositionBottom > get(plotPosition, 'bottom');
  if (isTooltipBeyondPlotBottom) {
    tooltipPosition.top -= tooltipHeight;
  }

  const tooltipPositionRight = pointPosition.left + tooltipWidth;
  const isTooltipBeyondPlotRight = tooltipPositionRight > get(plotPosition, 'right');
  if (isTooltipBeyondPlotRight) {
    tooltipPosition.left -= tooltipWidth;
  }

  return tooltipPosition;
}

const app = uiModules.get('xpack/watcher');

app.directive('chartTooltip', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: true,
    template: template,
    scope: {
      pointPosition: '=',
      plotPosition: '='
    },
    controllerAs: 'chartTooltip',
    bindToController: true,
    link: ($scope, element) => {
      $scope.$watchGroup([
        'chartTooltip.pointPosition',
        'chartTooltip.plotPosition'
      ], () => {
        // Calculate tooltip position. This is especially necessary to make sure the tooltip
        // stays within the bounds of the chart.
        const pointPosition = $scope.chartTooltip.pointPosition;
        const plotPosition  = $scope.chartTooltip.plotPosition;

        const tooltipMargin = parseInt(element.css('margin')); // assumption: value is in px
        const tooltipWidth  = element[0].scrollWidth + (2 * tooltipMargin);
        const tooltipHeight = element[0].scrollHeight + (2 * tooltipMargin);

        const tooltipPosition = calculateTooltipPosition(pointPosition, plotPosition, tooltipWidth, tooltipHeight);
        $scope.chartTooltip.style = tooltipPosition;
      });
    },
    controller: class ChartTooltipController {
      constructor() {
      }
    }
  };
});