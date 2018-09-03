/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering Explorer dashboard swimlanes.
 */

//import PropTypes from 'prop-types';
import React from 'react';

import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';

import { numTicksForDateFormat } from 'plugins/ml/util/chart_utils';
import { getSeverityColor } from 'plugins/ml/../common/util/anomaly_utils';
import { mlEscape } from 'plugins/ml/util/string_utils';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests

export class ExplorerSwimlane extends React.Component {
  static propTypes = {
  }

  constructor(props) {
    super(props);
    this.state = {
      cellMouseoverActive: true
    };
  }

  componentWillUnmount() {
    const { mlExplorerDashboardService } = this.props;
    mlExplorerDashboardService.dragSelect.unwatch(this.dragSelectListener);

  }
  componentDidMount() {
    console.warn('swimlane did mount');
    const element = $(this.rootNode).parent();

    const {
      clearSelection,
      mlExplorerDashboardService,
      swimlaneType,
      selectCell
    } = this.props;

    // Consider the setting to support to select a range of cells
    if (!mlExplorerDashboardService.allowCellRangeSelection) {
      element.addClass('ml-hide-range-selection');
    }

    // Listen for dragSelect events
    const that = this;
    this.dragSelectListener = function ({ action, elements = [] }) {
      if (action === 'newSelection' && elements.length > 0) {
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
          cellClick(elements, selectedData);
        }

        that.setState({ cellMouseoverActive: true });
      } else if (action === 'elementSelect') {
        element.addClass('ml-dragselect-dragging');
        return;
      } else if (action === 'dragStart') {
        that.setState({ cellMouseoverActive: false });
        return;
      }

      element.removeClass('ml-dragselect-dragging');
      elements.map(e => $(e).removeClass('ds-selected'));
    };

    mlExplorerDashboardService.dragSelect.watch(this.dragSelectListener);

    function cellClick(cellsToSelect, { laneLabels, bucketScore, times }) {
      if (cellsToSelect.length > 1 || bucketScore > 0) {
        selectCell(cellsToSelect, laneLabels, times, bucketScore, true);
      } else {
        clearSelection();
      }
    }

    this.renderSwimlane();
  }


  componentDidUpdate() {
    console.warn('swimlane did update');
    this.renderSwimlane();
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
      mlChartTooltipService,
      mlExplorerDashboardService,
      clearSelection,
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

    _.each(lanes, (lane) => {
      const $lane = $('<div>', {
        class: 'lane',
      });

      //$lane.on('mouseover', cellMouseover);
      //$lane.on('mouseleave', cellMouseleave);
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
          clearSelection();
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

      console.warn('$lane', $lane);
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
