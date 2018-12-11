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

import { AnnotationsTable } from './annotations_table';

import 'angular';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import chrome from 'ui/chrome';
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

module.directive('mlAnnotationTable', function () {

  function link(scope, element) {
    function renderReactComponent() {
      if (typeof scope.jobs === 'undefined') {
        return;
      }

      const props = {
        annotations: scope.annotations,
        jobs: scope.jobs,
        isSingleMetricViewerLinkVisible: scope.drillDown,
        isNumberBadgeVisible: true
      };

      ReactDOM.render(
        React.createElement(AnnotationsTable, props),
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

    if (mlAnnotationsEnabled) {
      scope.$watchCollection('annotations', renderFocusChart);
    }

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });

  }

  return {
    scope: {
      annotations: '=',
      drillDown: '=',
      jobs: '='
    },
    link: link
  };
});
