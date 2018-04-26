/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering Explorer dashboard swimlanes.
 */

import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import d3 from 'd3';

import { getSeverityColor } from 'plugins/ml/util/anomaly_utils';
import { numTicksForDateFormat } from 'plugins/ml/util/chart_utils';
import { IntervalHelperProvider } from 'plugins/ml/util/ml_time_buckets';
import { mlEscape } from 'plugins/ml/util/string_utils';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlExplorerSwimlane', function ($compile, Private, mlExplorerDashboardService, mlChartTooltipService) {

  function link(scope, element) {

    // Consider the setting to support to select a range of cells
    if (!mlExplorerDashboardService.allowCellRangeSelection) {
      element.addClass('ml-hide-range-selection');
    }

    let cellMouseoverActive = true;

    // Listen for dragSelect events
    function dragSelectListener({ action, elements = [] }) {
      if (action === 'newSelection' && elements.length > 0) {
        const firstCellData = $(elements[0]).data('click');
        if (typeof firstCellData !== 'undefined' && scope.swimlaneType === firstCellData.swimlaneType) {
          const selectedData = elements.reduce((d, e) => {
            const cellData = $(e).data('click');
            d.bucketScore = Math.max(d.bucketScore, cellData.bucketScore);
            d.laneLabels.push(cellData.laneLabel);
            d.times.push(cellData.time);
            return d;
          }, {
            bucketScore: 0,
            laneLabels: [],
            times: []
          });

          selectedData.laneLabels = _.uniq(selectedData.laneLabels);
          selectedData.times = _.uniq(selectedData.times);
          cellClick(elements, selectedData);
        }
        cellMouseoverActive = true;
      } else if (action === 'elementSelect') {
        element.addClass('ml-dragselect-dragging');
        return;
      } else if (action === 'dragStart') {
        cellMouseoverActive = false;
        return;
      }

      element.removeClass('ml-dragselect-dragging');
      elements.map(e => $(e).removeClass('ds-selected'));
    }

    mlExplorerDashboardService.dragSelect.watch(dragSelectListener);

    // Re-render the swimlane whenever the underlying data changes.
    function swimlaneDataChangeListener(swimlaneType) {
      if (swimlaneType === scope.swimlaneType) {
        render();
        checkForSelection();
      }
    }

    mlExplorerDashboardService.swimlaneDataChange.watch(swimlaneDataChangeListener);

    element.on('$destroy', () => {
      mlExplorerDashboardService.dragSelect.unwatch(dragSelectListener);
      mlExplorerDashboardService.swimlaneDataChange.unwatch(swimlaneDataChangeListener);
      scope.$destroy();
    });

    const MlTimeBuckets = Private(IntervalHelperProvider);

    function cellClick(cellsToSelect, { laneLabels, bucketScore, times }) {
      if (cellsToSelect.length > 1 || bucketScore > 0) {
        selectCell(cellsToSelect, laneLabels, times, bucketScore, true);
      } else {
        clearSelection();
      }
    }

    function render() {
      if (scope.swimlaneData === undefined) {
        return;
      }

      const lanes = scope.swimlaneData.laneLabels;
      const startTime = scope.swimlaneData.earliest;
      const endTime = scope.swimlaneData.latest;
      const stepSecs = scope.swimlaneData.interval;
      const points = scope.swimlaneData.points;

      function colorScore(value) {
        return getSeverityColor(value);
      }

      const numBuckets = parseInt((endTime - startTime) / stepSecs);
      const cellHeight = 30;
      const height = (lanes.length + 1) * cellHeight - 10;
      const laneLabelWidth = 170;

      element.css('height', (height + 20) + 'px');
      const $swimlanes = element.find('.ml-swimlanes').first();
      $swimlanes.empty();

      const cellWidth = Math.floor(scope.chartWidth / numBuckets);

      const xAxisWidth = cellWidth * numBuckets;
      const xAxisScale = d3.time.scale()
        .domain([new Date(startTime * 1000), new Date(endTime * 1000)])
        .range([0, xAxisWidth]);

      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new MlTimeBuckets();
      timeBuckets.setInterval(`${stepSecs}s`);
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();
      const xAxisTicks = xAxisScale.ticks(numTicksForDateFormat(scope.chartWidth, xAxisTickFormat));

      function cellMouseover($event, laneLabel, bucketScore, index, time) {
        if (bucketScore === undefined || cellMouseoverActive === false) {
          return;
        }

        const displayScore = (bucketScore > 1 ? parseInt(bucketScore) : '< 1');

        // Display date using same format as Kibana visualizations.
        const formattedDate = moment(time * 1000).format('MMMM Do YYYY, HH:mm');
        let contents = `${formattedDate}<br/><hr/>`;
        if (scope.swimlaneData.fieldName !== undefined) {
          contents += `${mlEscape(scope.swimlaneData.fieldName)}: ${mlEscape(laneLabel)}<br/><hr/>`;
        }
        contents += `Max anomaly score: ${displayScore}`;

        const offsets = ($event.target.className === 'sl-cell-inner' ? { x: 0, y: 0 } : { x: 2, y: 1 });
        mlChartTooltipService.show(contents, $event.target, {
          x: $event.target.offsetWidth - offsets.x,
          y: 10 + offsets.y
        });
      }

      function cellMouseleave() {
        mlChartTooltipService.hide();
      }

      _.each(lanes, (lane) => {
        const rowScope = scope.$new();
        rowScope.cellMouseover = cellMouseover;
        rowScope.cellMouseleave = cellMouseleave;

        const $lane = $('<div>', {
          class: 'lane',
        });

        const label = mlEscape(lane);
        const fieldName = mlEscape(scope.swimlaneData.fieldName);
        const laneDivProps = {
          class: 'lane-label',
          css: {
            width: laneLabelWidth + 'px'
          },
          html: label
        };

        if (scope.swimlaneData.fieldName !== undefined) {
          laneDivProps['tooltip-html-unsafe'] = `${fieldName}: ${label}`;
          laneDivProps['tooltip-placement'] = 'right';
          laneDivProps['aria-label'] = `${fieldName}: ${label}`;
        }

        const $label = $('<div>', laneDivProps);
        $label.on('click', () => {
          if (typeof scope.appState.mlExplorerSwimlane.selectedLanes !== 'undefined') {
            clearSelection();
          }
        });
        $lane.append($label);

        const $cellsContainer = $('<div>', {
          class: 'cells-container'
        });
        $lane.append($cellsContainer);

        // TODO - mark if zoomed in to bucket width?
        let time = startTime;
        for (let i = 0; i < numBuckets; i++) {
          const $cell = $('<div>', {
            class: 'sl-cell ',
            css: {
              width: cellWidth + 'px'
            },
            'data-lane-label': label,
            'data-time': time,

          });

          let color = 'none';
          let bucketScore = 0;
          for (let j = 0; j < points.length; j++) {
            // this may break if detectors have the duplicate descriptions
            if (points[j].value > 0 && points[j].laneLabel === lane && points[j].time === time) {
              bucketScore = points[j].value;
              color = colorScore(bucketScore);
              $cell.append($('<div>', {
                class: 'sl-cell-inner',
                css: {
                  'background-color': color
                }
              }));
              $cell.attr({ 'data-score': bucketScore });
              $cell.find('.sl-cell-inner-dragselect').remove();
            } else if ($cell.find('.sl-cell-inner-dragselect').length === 0 && $cell.find('.sl-cell-inner').length === 0) {
              $cell.append($('<div>', {
                class: 'sl-cell-inner-dragselect'
              }));
            }
          }

          // Escape single quotes and backslash characters in the HTML for the event handlers.
          $cell.data({
            'click': {
              bucketScore,
              laneLabel: lane,
              swimlaneType: scope.swimlaneType,
              time
            }
          });

          if (bucketScore > 0) {
            const safeLaneTxt = lane.replace(/(['\\])/g, '\\$1');
            const cellMouseoverTxt = 'cellMouseover($event, \'' + safeLaneTxt + '\', ' +
              bucketScore + ', ' + i + ', ' + time + ')';
            const cellMouseleaveTxt = 'cellMouseleave()';
            $cell.attr({
              'ng-mouseover': cellMouseoverTxt,
              'ng-mouseleave': cellMouseleaveTxt
            });
          }

          $cellsContainer.append($cell);

          time += stepSecs;
        }

        $swimlanes.append($lane);

        $compile($lane)(rowScope);
      });

      const $laneTimes = $('<div>', {
        class: 'time-tick-labels'
      });
      _.each(xAxisTicks, (tick) => {
        const $tickLabel = $('<div>', {
          class: 'tick-label',
          text: moment(tick).format(xAxisTickFormat)
        });
        const $tickLabelWrapper = $('<div>', {
          class: 'tick-label-wrapper',
          css: {
            'margin-left': (xAxisScale(tick)) + 'px'
          }
        });

        $tickLabelWrapper.append($tickLabel);
        $laneTimes.append($tickLabelWrapper);
      });

      $swimlanes.append($laneTimes);
      mlExplorerDashboardService.swimlaneRenderDone.changed();
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
      $('.ds-selected', '.ml-exlporer-swimlane').removeClass('ds-selected');

      delete scope.appState.mlExplorerSwimlane.selectedType;
      delete scope.appState.mlExplorerSwimlane.selectedLanes;
      delete scope.appState.mlExplorerSwimlane.selectedTimes;
      scope.appState.save();

      mlExplorerDashboardService.swimlaneCellClick.changed({});
    }
  }

  const template = `<div class="ml-swimlanes"></div>`;
  return {
    scope: {
      swimlaneType: '@',
      swimlaneData: '=',
      selectedJobIds: '=',
      chartWidth: '=',
      appState: '='
    },
    link: link,
    template: template
  };
});
