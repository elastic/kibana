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

import _ from 'lodash';
import $ from 'jquery';
import d3 from 'd3';

import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { mlEscape } from 'plugins/ml/util/string_utils';
import { mlChartTooltipService } from '../components/chart_tooltip/chart_tooltip_service';
import { ExplorerSwimlane } from './explorer_swimlane';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlExplorerSwimlane', function ($compile, Private, mlExplorerDashboardService) {

  function link(scope, element) {
    // Re-render the swimlane whenever the underlying data changes.
    function swimlaneDataChangeListener(swimlaneType) {
      if (swimlaneType === scope.swimlaneType) {
        render();
        checkForSelection();
      }
    }

    mlExplorerDashboardService.swimlaneDataChange.watch(swimlaneDataChangeListener);

    element.on('$destroy', () => {
      mlExplorerDashboardService.swimlaneDataChange.unwatch(swimlaneDataChangeListener);
      scope.$destroy();
    });

    const MlTimeBuckets = Private(IntervalHelperProvider);

    function render() {
      console.warn('directive render', _.cloneDeep(scope.swimlaneData));
      if (scope.swimlaneData === undefined) {
        return;
      }

      const lanes = scope.swimlaneData.laneLabels;
      const startTime = scope.swimlaneData.earliest;
      const endTime = scope.swimlaneData.latest;
      const stepSecs = scope.swimlaneData.interval;
      const points = scope.swimlaneData.points;

      const props = {
        lanes,
        startTime,
        endTime,
        stepSecs,
        points,
        chartWidth: scope.chartWidth,
        MlTimeBuckets,
        swimlaneData: scope.swimlaneData,
        swimlaneType: scope.swimlaneType,
        mlChartTooltipService,
        mlExplorerDashboardService,
        clearSelection,
        appState: scope.appState,
        selectCell
      };

      ReactDOM.render(
        React.createElement(ExplorerSwimlane, props),
        element[0]
      );
    }

    function checkForSelection() {
      // Check for selection in the AppState and reselect the corresponding swimlane cell
      // if the time range and lane label are still in view.
      const selectionState = scope.appState.mlExplorerSwimlane;
      const selectedType = _.get(selectionState, 'selectedType', undefined);
      const viewBy = _.get(selectionState, 'viewBy', '');
      if (scope.swimlaneType !== selectedType && selectedType !== undefined) {
        $('.lane-label', element).addClass('lane-label-masked');
        $('.sl-cell-inner', element).addClass('sl-cell-inner-masked');
      }

      if ((scope.swimlaneType !== selectedType) ||
        (scope.swimlaneData.fieldName !== undefined && scope.swimlaneData.fieldName !== viewBy)) {
        // Not this swimlane which was selected.
        return;
      }

      const cellsToSelect = [];
      const selectedLanes = _.get(selectionState, 'selectedLanes', []);
      const selectedTimes = _.get(selectionState, 'selectedTimes', []);
      const selectedTimeExtent = d3.extent(selectedTimes);

      const lanes = scope.swimlaneData.laneLabels;
      const startTime = scope.swimlaneData.earliest;
      const endTime = scope.swimlaneData.latest;

      selectedLanes.forEach((selectedLane) => {
        if (lanes.indexOf(selectedLane) > -1 && selectedTimeExtent[0] >= startTime && selectedTimeExtent[1] <= endTime) {
          // Locate matching cell - look for exact time, otherwise closest before.
          const $swimlanes = element.find('.ml-swimlanes').first();
          const laneCells = $('div[data-lane-label="' + mlEscape(selectedLane) + '"]', $swimlanes);
          if (laneCells.length === 0) {
            return;
          }

          for (let i = 0; i < laneCells.length; i++) {
            const cell = laneCells[i];
            const cellTime = $(cell).attr('data-time');
            if (cellTime >= selectedTimeExtent[0] && cellTime <= selectedTimeExtent[1]) {
              cellsToSelect.push(cell);
            }
          }
        }
      });
      const selectedMaxBucketScore = cellsToSelect.reduce((maxBucketScore, cell) => {
        return Math.max(maxBucketScore, +$(cell).attr('data-score') || 0);
      }, 0);
      if (cellsToSelect.length > 1 || selectedMaxBucketScore > 0) {
        selectCell(cellsToSelect, selectedLanes, selectedTimes, selectedMaxBucketScore);
      } else {
        // Clear selection from state as previous selection is no longer applicable.
        clearSelection();
      }

    }

    function selectCell(cellsToSelect, laneLabels, times, bucketScore, checkEqualSelection = false) {
      $('.lane-label', '.ml-explorer-swimlane').addClass('lane-label-masked');
      $('.sl-cell-inner,.sl-cell-inner-dragselect', '.ml-explorer-swimlane').addClass('sl-cell-inner-masked');
      $('.sl-cell-inner.sl-cell-inner-selected,.sl-cell-inner-dragselect.sl-cell-inner-selected',
        '.ml-explorer-swimlane').removeClass('sl-cell-inner-selected');

      $(cellsToSelect).find('.sl-cell-inner,.sl-cell-inner-dragselect')
        .removeClass('sl-cell-inner-masked')
        .addClass('sl-cell-inner-selected');

      $('.lane-label').filter(function () {
        return laneLabels.indexOf($(this).text()) > -1;
      }).removeClass('lane-label-masked');

      if (scope.swimlaneType === 'viewBy') {
        // If selecting a cell in the 'view by' swimlane, indicate the corresponding time in the Overall swimlane.
        const overallSwimlane = $('ml-explorer-swimlane[swimlane-type="overall"]');
        times.forEach(time => {
          const overallCell = $('div[data-time="' + time + '"]', overallSwimlane).find('.sl-cell-inner,.sl-cell-inner-dragselect');
          overallCell.addClass('sl-cell-inner-selected');
        });
      }

      // Check if the same cells were selected again, if so clear the selection,
      // otherwise activate the new selection. The two objects are built for
      // comparison because we cannot simply compare to "scope.appState.mlExplorerSwimlane"
      // since it also includes the "viewBy" attribute which might differ depending
      // on whether the overall or viewby swimlane was selected.
      if (checkEqualSelection && _.isEqual(
        {
          selectedType: scope.appState.mlExplorerSwimlane.selectedType,
          selectedLanes: scope.appState.mlExplorerSwimlane.selectedLanes,
          selectedTimes: scope.appState.mlExplorerSwimlane.selectedTimes
        },
        {
          selectedType: scope.swimlaneType,
          selectedLanes: laneLabels,
          selectedTimes: times
        }
      )) {
        clearSelection();
      } else {
        scope.appState.mlExplorerSwimlane.selectedType = scope.swimlaneType;
        scope.appState.mlExplorerSwimlane.selectedLanes = laneLabels;
        scope.appState.mlExplorerSwimlane.selectedTimes = times;
        scope.appState.save();

        mlExplorerDashboardService.swimlaneCellClick.changed({
          fieldName: scope.swimlaneData.fieldName,
          laneLabels,
          time: d3.extent(times),
          interval: scope.swimlaneData.interval,
          score: bucketScore
        });
      }
    }

    function clearSelection() {
      $('.lane-label', '.ml-explorer-swimlane').removeClass('lane-label-masked');
      $('.sl-cell-inner', '.ml-explorer-swimlane').removeClass('sl-cell-inner-masked');
      $('.sl-cell-inner.sl-cell-inner-selected', '.ml-explorer-swimlane').removeClass('sl-cell-inner-selected');
      $('.sl-cell-inner-dragselect.sl-cell-inner-selected', '.ml-explorer-swimlane').removeClass('sl-cell-inner-selected');
      $('.ds-selected', '.ml-explorer-swimlane').removeClass('ds-selected');

      delete scope.appState.mlExplorerSwimlane.selectedType;
      delete scope.appState.mlExplorerSwimlane.selectedLanes;
      delete scope.appState.mlExplorerSwimlane.selectedTimes;
      scope.appState.save();

      mlExplorerDashboardService.swimlaneCellClick.changed({});
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
    link: link
  };
});
