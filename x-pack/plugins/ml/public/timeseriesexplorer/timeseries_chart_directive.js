/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Chart plotting data from a single time series, with or without model plot enabled,
 * annotated with anomalies.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { TimeseriesChart } from './timeseries_chart';

import angular from 'angular';
import { timefilter } from 'ui/timefilter';

import { ResizeChecker } from 'ui/resize_checker';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlTimeseriesChart', function () {

  function link(scope, element) {
    // Key dimensions for the viz and constituent charts.
    let svgWidth = angular.element('.results-container').width();

    function contextChartSelected(selection) {
      scope.$root.$broadcast('contextChartSelected', selection);
    }

    function renderReactComponent(renderFocusChartOnly = false) {
      // Set the size of the components according to the width of the parent container at render time.
      svgWidth = Math.max(angular.element('.results-container').width(), 0);

      const props = {
        autoZoomDuration: scope.autoZoomDuration,
        contextAggregationInterval: scope.contextAggregationInterval,
        contextChartData: scope.contextChartData,
        contextForecastData: scope.contextForecastData,
        contextChartSelected: contextChartSelected,
        detectorIndex: scope.detectorIndex,
        focusChartData: scope.focusChartData,
        focusForecastData: scope.focusForecastData,
        focusAggregationInterval: scope.focusAggregationInterval,
        modelPlotEnabled: scope.modelPlotEnabled,
        renderFocusChartOnly,
        selectedJob: scope.selectedJob,
        showForecast: scope.showForecast,
        showModelBounds: scope.showModelBounds,
        svgWidth,
        swimlaneData: scope.swimlaneData,
        timefilter,
        zoomFrom: scope.zoomFrom,
        zoomTo: scope.zoomTo
      };

      ReactDOM.render(
        React.createElement(TimeseriesChart, props),
        element[0]
      );
    }

    renderReactComponent();

    scope.$on('render', () => {
      renderReactComponent();
    });

    function renderFocusChart() {
      renderReactComponent(true);
    }

    scope.$watchCollection('focusForecastData', renderFocusChart);
    scope.$watchCollection('focusChartData', renderFocusChart);
    scope.$watchGroup(['showModelBounds', 'showForecast'], renderFocusChart);

    // Redraw the charts when the container is resize.
    const resizeChecker = new ResizeChecker(angular.element('.ml-timeseries-chart'));
    resizeChecker.on('resize', () => {
      scope.$evalAsync(() => {
        renderReactComponent();
      });
    });

    element.on('$destroy', () => {
      resizeChecker.destroy();
      scope.$destroy();
    });

  }

  return {
    scope: {
      selectedJob: '=',
      detectorIndex: '=',
      modelPlotEnabled: '=',
      contextChartData: '=',
      contextForecastData: '=',
      contextChartAnomalyData: '=',
      focusChartData: '=',
      swimlaneData: '=',
      focusForecastData: '=',
      contextAggregationInterval: '=',
      focusAggregationInterval: '=',
      zoomFrom: '=',
      zoomTo: '=',
      autoZoomDuration: '=',
      showModelBounds: '=',
      showForecast: '='
    },
    link: link
  };
});
