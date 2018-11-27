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

import { AnnotationsTable } from '../../../jobs/jobs_list/components/job_details/annotations_table';

import 'angular';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { FEATURE_ANNOTATIONS_ENABLED } from '../../../../common/constants/feature_flags';

module.directive('mlAnnotationTable', function () {

  function link(scope, element) {
    function renderReactComponent() {
      if (typeof scope.job === 'undefined') {
        return;
      }

      const props = {
        focusAnnotationData: scope.focusAnnotationData,
        job: scope.job,
        renderEmptyMessage: false
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

    if (FEATURE_ANNOTATIONS_ENABLED) {
      scope.$watchCollection('focusAnnotationData', renderFocusChart);
      scope.$watch('showAnnotations', renderFocusChart);
    }

    element.on('$destroy', () => {
      // unmountComponentAtNode() needs to be called so mlAnomaliesTableService listeners within
      // the TimeseriesChart component get unwatched properly.
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });

  }

  return {
    scope: {
      focusAnnotationData: '=',
      job: '='
    },
    link: link
  };
});
