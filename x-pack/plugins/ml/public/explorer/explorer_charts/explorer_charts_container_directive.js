/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering the containing div for the charts of
 * anomalies in the raw data in the Machine Learning Explorer dashboard.
 */

import './styles/explorer_charts_container.less';

import React from 'react';
import ReactDOM from 'react-dom';

import $ from 'jquery';
import { ExplorerChartsContainer } from './explorer_charts_container';
import { explorerChartsContainerServiceFactory } from './explorer_charts_container_service';
import { mlChartTooltipService } from '../../components/chart_tooltip/chart_tooltip_service';
import { mlExplorerDashboardService } from '../explorer_dashboard_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlExplorerChartsContainer', function (
  mlSelectSeverityService
) {

  function link(scope, element) {
    const anomalyDataChangeListener = explorerChartsContainerServiceFactory(
      mlSelectSeverityService,
      updateComponent,
      $('.explorer-charts')
    );

    mlExplorerDashboardService.anomalyDataChange.watch(anomalyDataChangeListener);

    scope.$on('$destroy', () => {
      mlExplorerDashboardService.anomalyDataChange.unwatch(anomalyDataChangeListener);
    });

    // Create a div for the tooltip.
    $('.ml-explorer-charts-tooltip').remove();
    $('body').append('<div class="ml-explorer-tooltip ml-explorer-charts-tooltip" style="opacity:0; display: none;">');

    element.on('$destroy', function () {
      scope.$destroy();
    });

    function updateComponent(data) {
      const props = {
        chartsPerRow: data.chartsPerRow,
        seriesToPlot: data.seriesToPlot,
        // convert truthy/falsy value to Boolean
        tooManyBuckets: !!data.tooManyBuckets,
        mlSelectSeverityService,
        mlChartTooltipService
      };

      ReactDOM.render(
        React.createElement(ExplorerChartsContainer, props),
        element[0]
      );
    }

    mlExplorerDashboardService.chartsInitDone.changed();
  }

  return {
    restrict: 'E',
    replace: false,
    scope: false,
    link: link
  };
});
