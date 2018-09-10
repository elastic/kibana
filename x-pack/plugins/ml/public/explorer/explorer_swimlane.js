/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React from 'react';

import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { numTicksForDateFormat } from '../util/chart_utils';
import { getSeverityColor } from '../../common/util/anomaly_utils';
import { mlEscape } from '../util/string_utils';
import { mlChartTooltipService } from '../components/chart_tooltip/chart_tooltip_service';
import { DRAG_SELECT_ACTION } from './explorer_constants';

export class ExplorerSwimlane extends React.Component {
  static propTypes = {
    appState: PropTypes.object.isRequired,
    lanes: PropTypes.array.isRequired,
    mlExplorerDashboardService: PropTypes.object.isRequired
  }

  constructor(props) {
    super(props);
    this.state = {
      cellMouseoverActive: true
    };
  }

  componentWillUnmount() {
    const { mlExplorerDashboardService } = this.props;
    mlExplorerDashboardService.dragSelect.unwatch(this.boundDragSelectListener);

  }
  componentDidMount() {
    const element = $(this.rootNode).parent();
    const { mlExplorerDashboardService } = this.props;

    // Consider the setting to support to select a range of cells
    if (!mlExplorerDashboardService.allowCellRangeSelection) {
      element.addClass('ml-hide-range-selection');
    }

    // save the bound dragSelectListener to this property so it can be accessed again
    // in componentWillUnmount(), otherwise mlExplorerDashboardService.dragSelect.unwatch
    // is not able to check properly if it's still the same listener
    this.boundDragSelectListener = this.dragSelectListener.bind(this);
    mlExplorerDashboardService.dragSelect.watch(this.boundDragSelectListener);

    this.renderSwimlane();
  }


  componentDidUpdate() {
    this.renderSwimlane();
  }

  // property to remember the bound dragSelectListener
  boundDragSelectListener = null;

  // property for cellClick data comparison to be able to filter
  // consecutive click events with the same data.
  previousSelectedData = null;

  // Listen for dragSelect events
  dragSelectListener({ action, elements = [] }) {
    const element = $(this.rootNode).parent();
    const { swimlaneType } = this.props;

    if (action === DRAG_SELECT_ACTION.NEW_SELECTION && elements.length > 0) {
      const firstCellData = $(elements[0]).data('click');
      if (typeof firstCellData !== 'undefined' && swimlaneType === firstCellData.swimlaneType) {
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
        if (_.isEqual(selectedData, this.previousSelectedData) === false) {
          this.cellClick(elements, selectedData);
          this.previousSelectedData = selectedData;
        }
      }

      this.setState({ cellMouseoverActive: true });
    } else if (action === DRAG_SELECT_ACTION.ELEMENT_SELECT) {
      element.addClass('ml-dragselect-dragging');
      return;
    } else if (action === DRAG_SELECT_ACTION.DRAG_START) {
      this.setState({ cellMouseoverActive: false });
      return;
    }

    this.previousSelectedData = null;
    element.removeClass('ml-dragselect-dragging');
    elements.map(e => $(e).removeClass('ds-selected'));
  }

  cellClick(cellsToSelect, { laneLabels, bucketScore, times }) {
    if (cellsToSelect.length > 1 || bucketScore > 0) {
      this.selectCell(cellsToSelect, laneLabels, times, bucketScore, true);
    } else {
      this.clearSelection();
    }
  }

  checkForSelection() {
    const element = $(this.rootNode).parent();

    const {
      appState,
      swimlaneData,
      swimlaneType
    } = this.props;

    // Check for selection in the AppState and reselect the corresponding swimlane cell
    // if the time range and lane label are still in view.
    const selectionState = appState.mlExplorerSwimlane;
    const selectedType = _.get(selectionState, 'selectedType', undefined);
    const viewBy = _.get(selectionState, 'viewBy', '');
    if (swimlaneType !== selectedType && selectedType !== undefined) {
      $('.lane-label', element).addClass('lane-label-masked');
      $('.sl-cell-inner', element).addClass('sl-cell-inner-masked');
    }

    if ((swimlaneType !== selectedType) ||
      (swimlaneData.fieldName !== undefined && swimlaneData.fieldName !== viewBy)) {
      // Not this swimlane which was selected.
      return;
    }

    const cellsToSelect = [];
    const selectedLanes = _.get(selectionState, 'selectedLanes', []);
    const selectedTimes = _.get(selectionState, 'selectedTimes', []);
    const selectedTimeExtent = d3.extent(selectedTimes);

    const lanes = swimlaneData.laneLabels;
    const startTime = swimlaneData.earliest;
    const endTime = swimlaneData.latest;

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
      this.selectCell(cellsToSelect, selectedLanes, selectedTimes, selectedMaxBucketScore);
    } else {
      // Clear selection from state as previous selection is no longer applicable.
      this.clearSelection();
    }
  }

  selectCell(cellsToSelect, laneLabels, times, bucketScore, checkEqualSelection = false) {
    const {
      appState,
      mlExplorerDashboardService,
      swimlaneData,
      swimlaneType
    } = this.props;

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

    if (swimlaneType === 'viewBy') {
      // If selecting a cell in the 'view by' swimlane, indicate the corresponding time in the Overall swimlane.
      const overallSwimlane = $('ml-explorer-swimlane[swimlane-type="overall"]');
      times.forEach(time => {
        const overallCell = $('div[data-time="' + time + '"]', overallSwimlane).find('.sl-cell-inner,.sl-cell-inner-dragselect');
        overallCell.addClass('sl-cell-inner-selected');
      });
    }

    // Check if the same cells were selected again, if so clear the selection,
    // otherwise activate the new selection. The two objects are built for
    // comparison because we cannot simply compare to "appState.mlExplorerSwimlane"
    // since it also includes the "viewBy" attribute which might differ depending
    // on whether the overall or viewby swimlane was selected.
    if (checkEqualSelection && _.isEqual(
      {
        selectedType: appState.mlExplorerSwimlane.selectedType,
        selectedLanes: appState.mlExplorerSwimlane.selectedLanes,
        selectedTimes: appState.mlExplorerSwimlane.selectedTimes
      },
      {
        selectedType: swimlaneType,
        selectedLanes: laneLabels,
        selectedTimes: times
      }
    )) {
      this.clearSelection();
    } else {
      appState.mlExplorerSwimlane.selectedType = swimlaneType;
      appState.mlExplorerSwimlane.selectedLanes = laneLabels;
      appState.mlExplorerSwimlane.selectedTimes = times;
      appState.save();

      mlExplorerDashboardService.swimlaneCellClick.changed({
        fieldName: swimlaneData.fieldName,
        laneLabels,
        time: d3.extent(times),
        interval: swimlaneData.interval,
        score: bucketScore
      });
    }
  }


  clearSelection() {
    const { appState, mlExplorerDashboardService } = this.props;
    $('.lane-label', '.ml-explorer-swimlane').removeClass('lane-label-masked');
    $('.sl-cell-inner', '.ml-explorer-swimlane').removeClass('sl-cell-inner-masked');
    $('.sl-cell-inner.sl-cell-inner-selected', '.ml-explorer-swimlane').removeClass('sl-cell-inner-selected');
    $('.sl-cell-inner-dragselect.sl-cell-inner-selected', '.ml-explorer-swimlane').removeClass('sl-cell-inner-selected');
    $('.ds-selected', '.ml-explorer-swimlane').removeClass('ds-selected');

    delete appState.mlExplorerSwimlane.selectedType;
    delete appState.mlExplorerSwimlane.selectedLanes;
    delete appState.mlExplorerSwimlane.selectedTimes;
    appState.save();

    mlExplorerDashboardService.swimlaneCellClick.changed({});
  }

  renderSwimlane() {
    const element = $(this.rootNode).parent();

    const {
      cellMouseoverActive
    } = this.state;

    const {
      lanes,
      startTime,
      endTime,
      stepSecs,
      points,
      chartWidth,
      MlTimeBuckets,
      swimlaneData,
      swimlaneType,
      mlExplorerDashboardService,
      appState
    } = this.props;

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

    const cellWidth = Math.floor(chartWidth / numBuckets);

    const xAxisWidth = cellWidth * numBuckets;
    const xAxisScale = d3.time.scale()
      .domain([new Date(startTime * 1000), new Date(endTime * 1000)])
      .range([0, xAxisWidth]);

    // Get the scaled date format to use for x axis tick labels.
    const timeBuckets = new MlTimeBuckets();
    timeBuckets.setInterval(`${stepSecs}s`);
    const xAxisTickFormat = timeBuckets.getScaledDateFormat();

    function cellMouseover($event, laneLabel, bucketScore, index, time) {
      if (bucketScore === undefined || cellMouseoverActive === false) {
        return;
      }

      const displayScore = (bucketScore > 1 ? parseInt(bucketScore) : '< 1');

      // Display date using same format as Kibana visualizations.
      const formattedDate = moment(time * 1000).format('MMMM Do YYYY, HH:mm');
      let contents = `${formattedDate}<br/><hr/>`;
      if (swimlaneData.fieldName !== undefined) {
        contents += `${mlEscape(swimlaneData.fieldName)}: ${mlEscape(laneLabel)}<br/><hr/>`;
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

    const that = this;
    _.each(lanes, (lane) => {
      const $lane = $('<div>', {
        class: 'lane',
      });

      const label = mlEscape(lane);
      const fieldName = mlEscape(swimlaneData.fieldName);
      const laneDivProps = {
        class: 'lane-label',
        css: {
          width: laneLabelWidth + 'px'
        },
        html: label
      };

      if (swimlaneData.fieldName !== undefined) {
        laneDivProps['tooltip-html-unsafe'] = `${fieldName}: ${label}`;
        laneDivProps['tooltip-placement'] = 'right';
        laneDivProps['aria-label'] = `${fieldName}: ${label}`;
      }

      const $label = $('<div>', laneDivProps);
      $label.on('click', () => {
        if (typeof appState.mlExplorerSwimlane.selectedLanes !== 'undefined') {
          that.clearSelection();
        }
      });
      $lane.append($label);

      const $cellsContainer = $('<div>', {
        class: 'cells-container'
      });
      $lane.append($cellsContainer);

      const cellMouseOverFactory = (safeLaneTxt, bucketScore, i, time) => {
        return (e) => {
          cellMouseover(e, safeLaneTxt, bucketScore, i, time);
        };
      };

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
            swimlaneType,
            time
          }
        });

        if (bucketScore > 0) {
          const safeLaneTxt = lane.replace(/(['\\])/g, '\\$1');
          const cellMouseOver = cellMouseOverFactory(safeLaneTxt, bucketScore, i, time);
          $cell.on('mouseover', cellMouseOver);
          $cell.on('mouseleave', () => {
            cellMouseleave();
          });
        }

        $cellsContainer.append($cell);

        time += stepSecs;
      }

      $swimlanes.append($lane);
    });

    const laneTimes = d3.select($swimlanes.get(0))
      .append('div')
      .classed('time-tick-labels', true);

    // height of .time-tick-labels
    const svgHeight = 25;
    const svg = laneTimes.append('svg')
      .attr('width', chartWidth)
      .attr('height', svgHeight);

    const xAxis = d3.svg.axis()
      .scale(xAxisScale)
      .ticks(numTicksForDateFormat(chartWidth, xAxisTickFormat))
      .tickFormat(tick => moment(tick).format(xAxisTickFormat));

    const gAxis = svg.append('g').attr('class', 'x axis').call(xAxis);

    // remove overlapping labels
    let overlapCheck = 0;
    gAxis.selectAll('g.tick').each(function () {
      const tick = d3.select(this);
      const xTransform = d3.transform(tick.attr('transform')).translate[0];
      const tickWidth = tick.select('text').node().getBBox().width;
      const xMinOffset = xTransform - (tickWidth / 2);
      const xMaxOffset = xTransform + (tickWidth / 2);
      // if the tick label overlaps the previous label
      // (or overflows the chart to the left), remove it;
      // otherwise pick that label's offset as the new offset to check against
      if (xMinOffset < overlapCheck) {
        tick.remove();
      } else {
        overlapCheck = xTransform + (tickWidth / 2);
      }
      // if the last tick label overflows the chart to the right, remove it
      if (xMaxOffset > chartWidth) {
        tick.remove();
      }
    });

    mlExplorerDashboardService.swimlaneRenderDone.changed();

    this.checkForSelection();
  }

  shouldComponentUpdate() {
    return true;
  }

  setRef(componentNode) {
    this.rootNode = componentNode;
  }

  render() {
    return <div className="ml-swimlanes" ref={this.setRef.bind(this)} />;
  }
}
