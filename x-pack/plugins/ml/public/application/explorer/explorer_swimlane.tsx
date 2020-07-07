/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import React from 'react';
import './_explorer.scss';
import _ from 'lodash';
import d3 from 'd3';
import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';
import { TooltipValue } from '@elastic/charts';
import { formatHumanReadableDateTime } from '../util/date_utils';
import { numTicksForDateFormat } from '../util/chart_utils';
import { getSeverityColor } from '../../../common/util/anomaly_utils';
import { mlEscape } from '../util/string_utils';
import { ALLOW_CELL_RANGE_SELECTION, dragSelect$ } from './explorer_dashboard_service';
import { DRAG_SELECT_ACTION, SwimlaneType } from './explorer_constants';
import { EMPTY_FIELD_VALUE_LABEL } from '../timeseriesexplorer/components/entity_control/entity_control';
import { TimeBuckets as TimeBucketsClass } from '../util/time_buckets';
import {
  ChartTooltipService,
  ChartTooltipValue,
} from '../components/chart_tooltip/chart_tooltip_service';
import { OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';

const SCSS = {
  mlDragselectDragging: 'mlDragselectDragging',
  mlHideRangeSelection: 'mlHideRangeSelection',
};

interface NodeWithData extends Node {
  __clickData__: {
    time: number;
    bucketScore: number;
    laneLabel: string;
    swimlaneType: string;
  };
}

interface SelectedData {
  bucketScore: number;
  laneLabels: string[];
  times: number[];
}

export interface ExplorerSwimlaneProps {
  chartWidth: number;
  filterActive?: boolean;
  maskAll?: boolean;
  timeBuckets: InstanceType<typeof TimeBucketsClass>;
  swimlaneCellClick?: Function;
  swimlaneData: OverallSwimlaneData | ViewBySwimLaneData;
  swimlaneType: SwimlaneType;
  selection?: {
    lanes: any[];
    type: string;
    times: number[];
  };
  swimlaneRenderDoneListener?: Function;
  tooltipService: ChartTooltipService;
}

export class ExplorerSwimlane extends React.Component<ExplorerSwimlaneProps> {
  // Since this component is mostly rendered using d3 and cellMouseoverActive is only
  // relevant for d3 based interaction, we don't manage this using React's state
  // and intentionally circumvent the component lifecycle when updating it.
  cellMouseoverActive = true;

  dragSelectSubscriber: Subscription | null = null;

  rootNode = React.createRef<HTMLDivElement>();

  componentDidMount() {
    // property for data comparison to be able to filter
    // consecutive click events with the same data.
    let previousSelectedData: any = null;

    // Listen for dragSelect events
    this.dragSelectSubscriber = dragSelect$.subscribe(({ action, elements = [] }) => {
      const element = d3.select(this.rootNode.current!.parentNode!);
      const { swimlaneType } = this.props;

      if (action === DRAG_SELECT_ACTION.NEW_SELECTION && elements.length > 0) {
        element.classed(SCSS.mlDragselectDragging, false);
        const firstSelectedCell = (d3.select(elements[0]).node() as NodeWithData).__clickData__;

        if (
          typeof firstSelectedCell !== 'undefined' &&
          swimlaneType === firstSelectedCell.swimlaneType
        ) {
          const selectedData: SelectedData = elements.reduce(
            (d, e) => {
              const cell = (d3.select(e).node() as NodeWithData).__clickData__;
              d.bucketScore = Math.max(d.bucketScore, cell.bucketScore);
              d.laneLabels.push(cell.laneLabel);
              d.times.push(cell.time);
              return d;
            },
            {
              bucketScore: 0,
              laneLabels: [],
              times: [],
            }
          );

          selectedData.laneLabels = _.uniq(selectedData.laneLabels);
          selectedData.times = _.uniq(selectedData.times);
          if (_.isEqual(selectedData, previousSelectedData) === false) {
            // If no cells containing anomalies have been selected,
            // immediately clear the selection, otherwise trigger
            // a reload with the updated selected cells.
            if (selectedData.bucketScore === 0) {
              elements.map((e) => d3.select(e).classed('ds-selected', false));
              this.selectCell([], selectedData);
              previousSelectedData = null;
            } else {
              this.selectCell(elements, selectedData);
              previousSelectedData = selectedData;
            }
          }
        }

        this.cellMouseoverActive = true;
      } else if (action === DRAG_SELECT_ACTION.ELEMENT_SELECT) {
        element.classed(SCSS.mlDragselectDragging, true);
      } else if (action === DRAG_SELECT_ACTION.DRAG_START) {
        previousSelectedData = null;
        this.cellMouseoverActive = false;
        this.props.tooltipService.hide();
      }
    });

    this.renderSwimlane();
  }

  componentDidUpdate() {
    this.renderSwimlane();
  }

  componentWillUnmount() {
    if (this.dragSelectSubscriber !== null) {
      this.dragSelectSubscriber.unsubscribe();
    }
    const element = d3.select(this.rootNode.current!);
    element.html('');
  }

  selectCell(cellsToSelect: any[], { laneLabels, bucketScore, times }: SelectedData) {
    const { selection, swimlaneCellClick = () => {}, swimlaneData, swimlaneType } = this.props;

    let triggerNewSelection = false;

    if (cellsToSelect.length > 1 || bucketScore > 0) {
      triggerNewSelection = true;
    }

    // Check if the same cells were selected again, if so clear the selection,
    // otherwise activate the new selection. The two objects are built for
    // comparison because we cannot simply compare to "appState.mlExplorerSwimlane"
    // since it also includes the "viewBy" attribute which might differ depending
    // on whether the overall or viewby swimlane was selected.
    const oldSelection = {
      selectedType: selection && selection.type,
      selectedLanes: selection && selection.lanes,
      selectedTimes: selection && selection.times,
    };

    const newSelection = {
      selectedType: swimlaneType,
      selectedLanes: laneLabels,
      selectedTimes: d3.extent(times),
    };

    if (_.isEqual(oldSelection, newSelection)) {
      triggerNewSelection = false;
    }

    if (triggerNewSelection === false) {
      swimlaneCellClick({});
      return;
    }

    const selectedCells = {
      viewByFieldName: swimlaneData.fieldName,
      lanes: laneLabels,
      times: d3.extent(times),
      type: swimlaneType,
    };
    swimlaneCellClick(selectedCells);
  }

  highlightOverall(times: number[]) {
    const overallSwimlane = d3.select('.ml-swimlane-overall');
    times.forEach((time) => {
      const overallCell = overallSwimlane
        .selectAll(`div[data-time="${time}"]`)
        .selectAll('.sl-cell-inner,.sl-cell-inner-dragselect');
      overallCell.classed('sl-cell-inner-selected', true);
    });
  }

  highlightSelection(cellsToSelect: Node[], laneLabels: string[], times: number[]) {
    const { swimlaneType } = this.props;

    // This selects both overall and viewby swimlane
    const wrapper = d3.selectAll('.mlExplorerSwimlane');

    wrapper.selectAll('.lane-label').classed('lane-label-masked', true);
    wrapper
      .selectAll('.sl-cell-inner,.sl-cell-inner-dragselect')
      .classed('sl-cell-inner-masked', true);
    wrapper
      .selectAll(
        '.sl-cell-inner.sl-cell-inner-selected,.sl-cell-inner-dragselect.sl-cell-inner-selected'
      )
      .classed('sl-cell-inner-selected', false);

    d3.selectAll(cellsToSelect)
      .selectAll('.sl-cell-inner,.sl-cell-inner-dragselect')
      .classed('sl-cell-inner-masked', false)
      .classed('sl-cell-inner-selected', true);

    const rootParent = d3.select(this.rootNode.current!.parentNode!);
    rootParent.selectAll('.lane-label').classed('lane-label-masked', function (this: HTMLElement) {
      return laneLabels.indexOf(d3.select(this).text()) === -1;
    });

    if (swimlaneType === 'viewBy') {
      // If selecting a cell in the 'view by' swimlane, indicate the corresponding time in the Overall swimlane.
      this.highlightOverall(times);
    }
  }

  maskIrrelevantSwimlanes(maskAll: boolean) {
    if (maskAll === true) {
      // This selects both overall and viewby swimlane
      const allSwimlanes = d3.selectAll('.mlExplorerSwimlane');
      allSwimlanes.selectAll('.lane-label').classed('lane-label-masked', true);
      allSwimlanes
        .selectAll('.sl-cell-inner,.sl-cell-inner-dragselect')
        .classed('sl-cell-inner-masked', true);
    } else {
      const overallSwimlane = d3.select('.ml-swimlane-overall');
      overallSwimlane.selectAll('.lane-label').classed('lane-label-masked', true);
      overallSwimlane
        .selectAll('.sl-cell-inner,.sl-cell-inner-dragselect')
        .classed('sl-cell-inner-masked', true);
    }
  }

  clearSelection() {
    // This selects both overall and viewby swimlane
    const wrapper = d3.selectAll('.mlExplorerSwimlane');

    wrapper.selectAll('.lane-label').classed('lane-label-masked', false);
    wrapper.selectAll('.sl-cell-inner').classed('sl-cell-inner-masked', false);
    wrapper
      .selectAll('.sl-cell-inner.sl-cell-inner-selected')
      .classed('sl-cell-inner-selected', false);
    wrapper
      .selectAll('.sl-cell-inner-dragselect.sl-cell-inner-selected')
      .classed('sl-cell-inner-selected', false);
    wrapper.selectAll('.ds-selected').classed('sl-cell-inner-selected', false);
  }

  renderSwimlane() {
    const element = d3.select(this.rootNode.current!.parentNode!);

    // Consider the setting to support to select a range of cells
    if (!ALLOW_CELL_RANGE_SELECTION) {
      element.classed(SCSS.mlHideRangeSelection, true);
    }

    // This getter allows us to fetch the current value in `cellMouseover()`.
    // Otherwise it will just refer to the value when `cellMouseover()` was instantiated.
    const getCellMouseoverActive = () => this.cellMouseoverActive;

    const {
      chartWidth,
      filterActive,
      maskAll,
      timeBuckets,
      swimlaneCellClick,
      swimlaneData,
      swimlaneType,
      selection,
    } = this.props;

    const {
      laneLabels: lanes,
      earliest: startTime,
      latest: endTime,
      interval: stepSecs,
      points,
    } = swimlaneData;

    const cellMouseover = (
      target: HTMLElement,
      laneLabel: string,
      bucketScore: number,
      index: number,
      time: number
    ) => {
      if (bucketScore === undefined || getCellMouseoverActive() === false) {
        return;
      }

      const displayScore = bucketScore > 1 ? parseInt(String(bucketScore), 10) : '< 1';

      // Display date using same format as Kibana visualizations.
      const formattedDate = formatHumanReadableDateTime(time * 1000);
      const tooltipData: TooltipValue[] = [{ label: formattedDate } as TooltipValue];

      if (swimlaneData.fieldName !== undefined) {
        tooltipData.push({
          label: swimlaneData.fieldName,
          value: laneLabel,
          // @ts-ignore
          seriesIdentifier: {
            key: laneLabel,
          },
          valueAccessor: 'fieldName',
        });
      }
      tooltipData.push({
        label: i18n.translate('xpack.ml.explorer.swimlane.maxAnomalyScoreLabel', {
          defaultMessage: 'Max anomaly score',
        }),
        value: displayScore,
        color: colorScore(bucketScore),
        // @ts-ignore
        seriesIdentifier: {
          key: laneLabel,
        },
        valueAccessor: 'anomaly_score',
      });

      const offsets = target.className === 'sl-cell-inner' ? { x: 6, y: 0 } : { x: 8, y: 1 };

      this.props.tooltipService.show(tooltipData, target, {
        x: target.offsetWidth + offsets.x,
        y: 6 + offsets.y,
      });
    };

    function colorScore(value: number): string {
      return getSeverityColor(value);
    }

    const numBuckets = Math.round((endTime - startTime) / stepSecs);
    const cellHeight = 30;
    const height = (lanes.length + 1) * cellHeight - 10;
    const laneLabelWidth = 170;

    element.style('height', `${height + 20}px`);
    const swimlanes = element.select('.ml-swimlanes');
    swimlanes.html('');

    const cellWidth = Math.floor((chartWidth / numBuckets) * 100) / 100;

    const xAxisWidth = cellWidth * numBuckets;
    const xAxisScale = d3.time
      .scale()
      .domain([new Date(startTime * 1000), new Date(endTime * 1000)])
      .range([0, xAxisWidth]);

    // Get the scaled date format to use for x axis tick labels.
    timeBuckets.setInterval(`${stepSecs}s`);
    const xAxisTickFormat = timeBuckets.getScaledDateFormat();

    function cellMouseOverFactory(time: number, i: number) {
      // Don't use an arrow function here because we need access to `this`,
      // which is where d3 supplies a reference to the corresponding DOM element.
      return function (this: HTMLElement, lane: string) {
        const bucketScore = getBucketScore(lane, time);
        if (bucketScore !== 0) {
          lane = lane === '' ? EMPTY_FIELD_VALUE_LABEL : lane;
          cellMouseover(this, lane, bucketScore, i, time);
        }
      };
    }

    const cellMouseleave = () => {
      this.props.tooltipService.hide();
    };

    const d3Lanes = swimlanes.selectAll('.lane').data(lanes);
    const d3LanesEnter = d3Lanes.enter().append('div').classed('lane', true);

    const that = this;

    d3LanesEnter
      .append('div')
      .classed('lane-label', true)
      .style('width', `${laneLabelWidth}px`)
      .html((label: string) => {
        const showFilterContext = filterActive === true && label === 'Overall';
        if (showFilterContext) {
          return i18n.translate('xpack.ml.explorer.overallSwimlaneUnfilteredLabel', {
            defaultMessage: '{label} (unfiltered)',
            values: { label: mlEscape(label) },
          });
        } else {
          return label === '' ? `<i>${EMPTY_FIELD_VALUE_LABEL}</i>` : mlEscape(label);
        }
      })
      .on('click', () => {
        if (selection && typeof selection.lanes !== 'undefined' && swimlaneCellClick) {
          swimlaneCellClick({});
        }
      })
      .each(function (this: HTMLElement) {
        if (swimlaneData.fieldName !== undefined) {
          d3.select(this)
            .on('mouseover', (value) => {
              that.props.tooltipService.show(
                [
                  { skipHeader: true } as ChartTooltipValue,
                  {
                    label: swimlaneData.fieldName!,
                    value: value === '' ? EMPTY_FIELD_VALUE_LABEL : value,
                    // @ts-ignore
                    seriesIdentifier: { key: value },
                    valueAccessor: 'fieldName',
                  },
                ],
                this,
                {
                  x: laneLabelWidth,
                  y: 0,
                }
              );
            })
            .on('mouseout', () => {
              that.props.tooltipService.hide();
            })
            .attr(
              'aria-label',
              (value) => `${mlEscape(swimlaneData.fieldName!)}: ${mlEscape(value)}`
            );
        }
      });

    const cellsContainer = d3LanesEnter.append('div').classed('cells-container', true);

    function getBucketScore(lane: string, time: number): number {
      let bucketScore = 0;
      const point = points.find((p) => {
        return p.value > 0 && p.laneLabel === lane && p.time === time;
      });
      if (typeof point !== 'undefined') {
        bucketScore = point.value;
      }
      return bucketScore;
    }

    // TODO - mark if zoomed in to bucket width?
    let time = startTime;
    Array(numBuckets || 0)
      .fill(null)
      .forEach((v, i) => {
        const cell = cellsContainer
          .append('div')
          .classed('sl-cell', true)
          .style('width', `${cellWidth}px`)
          .attr('data-lane-label', (label: string) => mlEscape(label))
          .attr('data-time', time)
          .attr('data-bucket-score', (lane: string) => {
            return getBucketScore(lane, time);
          })
          // use a factory here to bind the `time` and `i` values
          // of this iteration to the event.
          .on('mouseover', cellMouseOverFactory(time, i))
          .on('mouseleave', cellMouseleave)
          .each(function (this: NodeWithData, laneLabel: string) {
            this.__clickData__ = {
              bucketScore: getBucketScore(laneLabel, time),
              laneLabel,
              swimlaneType,
              time,
            };
          });

        // calls itself with each() to get access to lane (= d3 data)
        cell.append('div').each(function (this: HTMLElement, lane: string) {
          const el = d3.select(this);

          let color = 'none';
          let bucketScore = 0;

          const point = points.find((p) => {
            return p.value > 0 && p.laneLabel === lane && p.time === time;
          });

          if (typeof point !== 'undefined') {
            bucketScore = point.value;
            color = colorScore(bucketScore);
            el.classed('sl-cell-inner', true).style('background-color', color);
          } else {
            el.classed('sl-cell-inner-dragselect', true);
          }
        });

        time += stepSecs;
      });

    // ['x-axis'] is just a placeholder so we have an array of 1.
    const laneTimes = swimlanes
      .selectAll('.time-tick-labels')
      .data(['x-axis'])
      .enter()
      .append('div')
      .classed('time-tick-labels', true);

    // height of .time-tick-labels
    const svgHeight = 25;
    const svg = laneTimes.append('svg').attr('width', chartWidth).attr('height', svgHeight);

    const xAxis = d3.svg
      .axis()
      .scale(xAxisScale)
      .ticks(numTicksForDateFormat(chartWidth, xAxisTickFormat))
      .tickFormat((tick) => moment(tick).format(xAxisTickFormat));

    const gAxis = svg.append('g').attr('class', 'x axis').call(xAxis);

    // remove overlapping labels
    let overlapCheck = 0;
    gAxis.selectAll('g.tick').each(function (this: HTMLElement) {
      const tick = d3.select(this);
      const xTransform = d3.transform(tick.attr('transform')).translate[0];
      const tickWidth = (tick.select('text').node() as SVGGraphicsElement).getBBox().width;
      const xMinOffset = xTransform - tickWidth / 2;
      const xMaxOffset = xTransform + tickWidth / 2;
      // if the tick label overlaps the previous label
      // (or overflows the chart to the left), remove it;
      // otherwise pick that label's offset as the new offset to check against
      if (xMinOffset < overlapCheck) {
        tick.remove();
      } else {
        overlapCheck = xTransform + tickWidth / 2;
      }
      // if the last tick label overflows the chart to the right, remove it
      if (xMaxOffset > chartWidth) {
        tick.remove();
      }
    });

    // Check for selection and reselect the corresponding swimlane cell
    // if the time range and lane label are still in view.
    const selectionState = selection;
    const selectedType = _.get(selectionState, 'type', undefined);
    const selectionViewByFieldName = _.get(selectionState, 'viewByFieldName', '');

    // If a selection was done in the other swimlane, add the "masked" classes
    // to de-emphasize the swimlane cells.
    if (swimlaneType !== selectedType && selectedType !== undefined) {
      element.selectAll('.lane-label').classed('lane-label-masked', true);
      element.selectAll('.sl-cell-inner').classed('sl-cell-inner-masked', true);
    }

    if (this.props.swimlaneRenderDoneListener) {
      this.props.swimlaneRenderDoneListener();
    }

    if (
      (swimlaneType !== selectedType ||
        (swimlaneData.fieldName !== undefined &&
          swimlaneData.fieldName !== selectionViewByFieldName)) &&
      filterActive === false
    ) {
      // Not this swimlane which was selected.
      return;
    }

    const cellsToSelect: Node[] = [];
    const selectedLanes = _.get(selectionState, 'lanes', []);
    const selectedTimes = _.get(selectionState, 'times', []);
    const selectedTimeExtent = d3.extent(selectedTimes);

    selectedLanes.forEach((selectedLane) => {
      if (
        lanes.indexOf(selectedLane) > -1 &&
        selectedTimeExtent[0] >= startTime &&
        selectedTimeExtent[1] <= endTime
      ) {
        // Locate matching cell - look for exact time, otherwise closest before.
        const swimlaneElements = element.select('.ml-swimlanes');
        const laneCells = swimlaneElements.selectAll(
          `div[data-lane-label="${mlEscape(selectedLane)}"]`
        );

        laneCells.each(function (this: HTMLElement) {
          const cell = d3.select(this);
          const cellTime = parseInt(cell.attr('data-time'), 10);
          if (cellTime >= selectedTimeExtent[0] && cellTime <= selectedTimeExtent[1]) {
            cellsToSelect.push(cell.node());
          }
        });
      }
    });

    const selectedMaxBucketScore = cellsToSelect.reduce((maxBucketScore, cell) => {
      return Math.max(maxBucketScore, +d3.select(cell).attr('data-bucket-score') || 0);
    }, 0);

    const selectedCellTimes = cellsToSelect.map((e) => {
      return (d3.select(e).node() as NodeWithData).__clickData__.time;
    });

    if (cellsToSelect.length > 1 || selectedMaxBucketScore > 0) {
      this.highlightSelection(cellsToSelect, selectedLanes, selectedCellTimes);
    } else if (filterActive === true) {
      if (selectedCellTimes.length > 0) {
        this.highlightOverall(selectedCellTimes);
      }
      this.maskIrrelevantSwimlanes(Boolean(maskAll));
    } else {
      this.clearSelection();
    }
  }

  shouldComponentUpdate() {
    return true;
  }

  render() {
    const { swimlaneType } = this.props;

    return <div className={`ml-swimlanes ml-swimlane-${swimlaneType}`} ref={this.rootNode} />;
  }
}
