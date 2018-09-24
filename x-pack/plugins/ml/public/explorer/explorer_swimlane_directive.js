/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering Explorer dashboard swimlanes.
 */

import _ from '@elastic/lodash';
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
      // unmountComponentAtNode() needs to be called so dragSelectListener within
      // the ExplorerSwimlane component gets unwatched properly.
      ReactDOM.unmountComponentAtNode(element[0]);
      scope.$destroy();
    });

    const MlTimeBuckets = Private(IntervalHelperProvider);

    // This triggers the render function quite aggressively, but we want to make sure we don't miss
    // any updates to related scopes of directives and/or controllers. However, we do a deep comparison
    // of current and future props to filter redundant render triggers.
    scope.$watch(function () {
      render();
    });
    let previousProps = null;
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

      if (_.isEqual(props, previousProps) === false) {
        ReactDOM.render(
          React.createElement(ExplorerSwimlane, props),
          element[0]
        );
        previousProps = props;
      }

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
