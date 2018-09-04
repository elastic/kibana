/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering Explorer dashboard swimlanes.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { ExplorerSwimlane } from './explorer_swimlane';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlExplorerSwimlane', function ($compile, Private, mlExplorerDashboardService) {

  function link(scope, element) {
    // Re-render the swimlane whenever the underlying data changes.
    function swimlaneDataChangeListener(swimlaneType) {
      if (swimlaneType === scope.swimlaneType) {
        render();
      }
    }

    mlExplorerDashboardService.swimlaneDataChange.watch(swimlaneDataChangeListener);

    element.on('$destroy', () => {
      mlExplorerDashboardService.swimlaneDataChange.unwatch(swimlaneDataChangeListener);
      scope.$destroy();
    });

    const MlTimeBuckets = Private(IntervalHelperProvider);

    function render() {
      if (scope.swimlaneData === undefined) {
        return;
      }

      const props = {
        lanes: scope.swimlaneData.laneLabels,
        startTime: scope.swimlaneData.earliest,
        endTime: scope.swimlaneData.latest,
        stepSecs: scope.swimlaneData.interval,
        points: scope.swimlaneData.points,
        chartWidth: scope.chartWidth,
        MlTimeBuckets,
        swimlaneData: scope.swimlaneData,
        swimlaneType: scope.swimlaneType,
        mlExplorerDashboardService,
        appState: scope.appState
      };

      ReactDOM.render(
        React.createElement(ExplorerSwimlane, props),
        element[0]
      );
    }
  }

  return {
    scope: {
      swimlaneType: '@',
      swimlaneData: '=',
      selectedJobIds: '=',
      chartWidth: '=',
      appState: '='
    },
    link
  };
});
