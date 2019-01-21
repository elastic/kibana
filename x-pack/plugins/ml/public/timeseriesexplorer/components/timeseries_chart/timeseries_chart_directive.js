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
import { toastNotifications } from 'ui/notify';

import { ResizeChecker } from 'ui/resize_checker';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { ml } from 'plugins/ml/services/ml_api_service';

import { I18nProvider } from '@kbn/i18n/react';

import chrome from 'ui/chrome';
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

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
        indexAnnotation: ml.annotations.indexAnnotation,
        autoZoomDuration: scope.autoZoomDuration,
        contextAggregationInterval: scope.contextAggregationInterval,
        contextChartData: scope.contextChartData,
        contextForecastData: scope.contextForecastData,
        contextChartSelected: contextChartSelected,
        deleteAnnotation: ml.annotations.deleteAnnotation,
        detectorIndex: scope.detectorIndex,
        focusAnnotationData: scope.focusAnnotationData,
        focusChartData: scope.focusChartData,
        focusForecastData: scope.focusForecastData,
        focusAggregationInterval: scope.focusAggregationInterval,
        modelPlotEnabled: scope.modelPlotEnabled,
        refresh: scope.refresh,
        renderFocusChartOnly,
        selectedJob: scope.selectedJob,
        showAnnotations: scope.showAnnotations,
        showForecast: scope.showForecast,
        showModelBounds: scope.showModelBounds,
        svgWidth,
        swimlaneData: scope.swimlaneData,
        timefilter,
        toastNotifications,
        zoomFrom: scope.zoomFrom,
        zoomTo: scope.zoomTo
      };

      ReactDOM.render(
        <I18nProvider>
          {React.createElement(TimeseriesChart, props)}
        </I18nProvider>,
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
    if (mlAnnotationsEnabled) {
      scope.$watchCollection('focusAnnotationData', renderFocusChart);
      scope.$watch('showAnnotations', renderFocusChart);
    }

    // Redraw the charts when the container is resize.
    const resizeChecker = new ResizeChecker(angular.element('.ml-timeseries-chart'));
    resizeChecker.on('resize', () => {
      scope.$evalAsync(() => {
        renderReactComponent();
      });
    });

    element.on('$destroy', () => {
      resizeChecker.destroy();
      // unmountComponentAtNode() needs to be called so mlTableService listeners within
      // the TimeseriesChart component get unwatched properly.
      ReactDOM.unmountComponentAtNode(element[0]);
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
      focusAnnotationData: '=',
      focusForecastData: '=',
      contextAggregationInterval: '=',
      focusAggregationInterval: '=',
      zoomFrom: '=',
      zoomTo: '=',
      autoZoomDuration: '=',
      refresh: '=',
      showAnnotations: '=',
      showModelBounds: '=',
      showForecast: '='
    },
    link: link
  };
});
