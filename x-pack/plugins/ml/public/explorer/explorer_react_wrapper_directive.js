/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's React component.
 */

import _ from 'lodash';

import React from 'react';
import ReactDOM from 'react-dom';

import { Explorer } from './explorer';

import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { SWIMLANE_TYPE } from './explorer_constants';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nProvider } from '@kbn/i18n/react';

module.directive('mlExplorerReactWrapper', function (Private) {
  const TimeBuckets = Private(IntervalHelperProvider);

  function link(scope, element) {
    function getSwimlaneData(swimlaneType) {
      switch (swimlaneType) {
        case SWIMLANE_TYPE.OVERALL:
          return scope.overallSwimlaneData;
        case SWIMLANE_TYPE.VIEW_BY:
          return scope.viewBySwimlaneData;
      }
    }

    function mapScopeToSwimlaneProps(swimlaneType) {
      return {
        chartWidth: scope.swimlaneWidth,
        MlTimeBuckets: TimeBuckets,
        swimlaneData: getSwimlaneData(swimlaneType),
        swimlaneType,
        selection: scope.appState.mlExplorerSwimlane,
      };
    }

    function render() {
      const props = _.pick(scope, [
        'annotationsData',
        'anomalyChartRecords',
        'hasResults',
        'influencers',
        'jobs',
        'loading',
        'mlCheckboxShowChartsService',
        'mlSelectIntervalService',
        'mlSelectLimitService',
        'mlSelectSeverityService',
        'noInfluencersConfigured',
        'setSwimlaneSelectActive',
        'setSwimlaneViewBy',
        'showViewBySwimlane',
        'swimlaneViewByFieldName',
        'tableData',
        'viewByLoadedForTimeFormatted',
        'viewBySwimlaneOptions',
      ]);

      props.swimlaneOverall = mapScopeToSwimlaneProps(SWIMLANE_TYPE.OVERALL);
      props.swimlaneViewBy = mapScopeToSwimlaneProps(SWIMLANE_TYPE.VIEW_BY);

      ReactDOM.render(
        <I18nProvider>{React.createElement(Explorer, props)}</I18nProvider>,
        element[0]
      );
    }

    render();

    scope.$watch(() => {
      render();
    });

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });
  }

  return {
    scope: false,
    link,
  };
});
