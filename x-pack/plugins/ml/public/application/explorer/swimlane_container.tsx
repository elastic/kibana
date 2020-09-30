/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiText,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { throttle } from 'lodash';
import { Chart, Settings, Heatmap } from '@elastic/charts';
import moment from 'moment';
import { ExplorerSwimlaneProps } from './explorer_swimlane';

import { SwimLanePagination } from './swimlane_pagination';
import { ViewBySwimLaneData } from './explorer_utils';
import { ANOMALY_THRESHOLD } from '../../../common';

/**
 * Ignore insignificant resize, e.g. browser scrollbar appearance.
 */
const RESIZE_IGNORED_DIFF_PX = 20;
const RESIZE_THROTTLE_TIME_MS = 500;

export function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData {
  return arg && arg.hasOwnProperty('cardinality');
}

/**
 * Anomaly swim lane container responsible for handling resizing, pagination and injecting
 * tooltip service.
 *
 * @param children
 * @param onResize
 * @param perPage
 * @param fromPage
 * @param swimlaneLimit
 * @param onPaginationChange
 * @param props
 * @constructor
 */
export const SwimlaneContainer: FC<
  Omit<ExplorerSwimlaneProps, 'chartWidth' | 'tooltipService' | 'parentRef'> & {
    onResize: (width: number) => void;
    fromPage?: number;
    perPage?: number;
    swimlaneLimit?: number;
    onPaginationChange?: (arg: { perPage?: number; fromPage?: number }) => void;
    isLoading: boolean;
    noDataWarning: string | JSX.Element | null;
    id: string;
  }
> = ({
  id,
  children,
  onResize,
  perPage,
  fromPage,
  swimlaneLimit,
  onPaginationChange,
  isLoading,
  noDataWarning,
  ...props
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

  const containerHeightRef = useRef<number>();
  /** Amount of rows during the previous render */
  const prevRowsCount = useRef<number>();

  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      const labelWidth = 200;
      const resultNewWidth = e.width - labelWidth;
      if (Math.abs(resultNewWidth - chartWidth) > RESIZE_IGNORED_DIFF_PX) {
        setChartWidth(resultNewWidth);
        onResize(resultNewWidth);
      }
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  const showSwimlane =
    props.swimlaneData &&
    props.swimlaneData.laneLabels &&
    props.swimlaneData.laneLabels.length > 0 &&
    props.swimlaneData.points.length > 0;

  const isPaginationVisible =
    (showSwimlane || isLoading) &&
    swimlaneLimit !== undefined &&
    onPaginationChange &&
    fromPage &&
    perPage;

  const CELL_HEIGHT = 30;

  const rowsCount = props?.swimlaneData?.laneLabels?.length ?? 0;

  useEffect(() => {
    // to prevent the visualization  form jumping during loading
    if (!isLoading || rowsCount !== prevRowsCount.current) {
      containerHeightRef.current = rowsCount * CELL_HEIGHT + 58;
      prevRowsCount.current = rowsCount;
    }
  }, [rowsCount, isLoading, prevRowsCount.current]);

  const highlightedData = props.selection
    ? { x: props.selection.times.map((v) => v * 1000), y: props.selection.lanes }
    : undefined;

  return (
    <>
      <EuiResizeObserver onResize={resizeHandler}>
        {(resizeRef) => (
          <EuiFlexGroup
            gutterSize={'none'}
            direction={'column'}
            style={{ width: '100%', height: '100%', overflow: 'hidden' }}
            ref={(el) => {
              resizeRef(el);
            }}
            data-test-subj="mlSwimLaneContainer"
          >
            <EuiFlexItem
              style={{
                width: '100%',
                overflowY: 'auto',
                height: `${containerHeightRef.current}px`,
              }}
              grow={false}
            >
              {showSwimlane && !isLoading && (
                <Chart>
                  <Settings
                    onElementClick={(e) => {
                      const [[cell]] = e;
                      const payload = {
                        lanes: [cell.datum.y],
                        times: [cell.datum.x / 1000, cell.datum.x / 1000],
                        type: props.swimlaneType,
                        viewByFieldName: props.swimlaneData.fieldName,
                      };
                      props.onCellsSelection(payload);
                    }}
                    showLegend={false}
                    legendPosition="top"
                    onBrushEnd={(e) => {
                      const payload = {
                        lanes: e.y,
                        times: e.x.map((v) => v / 1000),
                        type: props.swimlaneType,
                        viewByFieldName: props.swimlaneData.fieldName,
                      };
                      props.onCellsSelection(payload);
                    }}
                    brushAxis="both"
                    xDomain={{
                      min: props.swimlaneData.earliest * 1000,
                      max: props.swimlaneData.latest * 1000,
                      minInterval: props.swimlaneData.interval * 1000,
                    }}
                  />
                  <Heatmap
                    id={id}
                    ranges={[
                      ANOMALY_THRESHOLD.LOW,
                      ANOMALY_THRESHOLD.WARNING,
                      ANOMALY_THRESHOLD.MINOR,
                      ANOMALY_THRESHOLD.MAJOR,
                      ANOMALY_THRESHOLD.CRITICAL,
                    ]}
                    colorScale={'threshold'}
                    colors={['#ffffff', '#d2e9f7', '#8bc8fb', '#fdec25', '#fba740', '#fe5050']}
                    data={props.swimlaneData.points
                      .map((v) => ({ ...v, time: v.time * 1000 }))
                      .filter((v) => v.value > 0)}
                    xAccessor={(d) => d.time}
                    yAccessor={(d) => {
                      return d.laneLabel;
                    }}
                    valueAccessor={(d) => {
                      return d.value;
                    }}
                    highlightedData={highlightedData}
                    valueFormatter={(d) => d.toFixed(0.2)}
                    xScaleType={'time'}
                    ySortPredicate="dataIndex"
                    config={{
                      grid: {
                        cellHeight: {
                          min: CELL_HEIGHT,
                          max: CELL_HEIGHT, // 'fill',
                        },
                        stroke: {
                          width: 1,
                          color: '#D3DAE6',
                        },
                      },
                      cell: {
                        maxWidth: 'fill',
                        maxHeight: 'fill',
                        label: {
                          visible: false,
                        },
                        border: {
                          stroke: '#D3DAE6',
                          strokeWidth: 0,
                        },
                      },
                      yAxisLabel: {
                        visible: true,
                        width: 170,
                        // eui color subdued
                        fill: `#6a717d`,
                        padding: 8,
                      },
                      xAxisLabel: {
                        // eui color subdued
                        fill: `#98A2B3`,
                        formatter: (v) => {
                          props.timeBuckets.setInterval(`${props.swimlaneData.interval}s`);
                          const a = props.timeBuckets.getScaledDateFormat();
                          return moment(v).format(a);
                        },
                      },
                    }}
                  />
                </Chart>
              )}

              {isLoading && (
                <EuiText textAlign={'center'}>
                  <EuiLoadingChart
                    size="xl"
                    mono={true}
                    data-test-subj="mlSwimLaneLoadingIndicator"
                  />
                </EuiText>
              )}
              {!isLoading && !showSwimlane && (
                <EuiEmptyPrompt
                  titleSize="xs"
                  style={{ padding: 0 }}
                  title={<h2>{noDataWarning}</h2>}
                />
              )}
            </EuiFlexItem>

            {isPaginationVisible && (
              <EuiFlexItem grow={false}>
                <SwimLanePagination
                  cardinality={swimlaneLimit!}
                  fromPage={fromPage!}
                  perPage={perPage!}
                  onPaginationChange={onPaginationChange!}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiResizeObserver>
    </>
  );
};
