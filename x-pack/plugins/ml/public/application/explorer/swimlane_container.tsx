/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiText,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { throttle } from 'lodash';
import {
  Chart,
  Settings,
  Heatmap,
  HeatmapElementEvent,
  HeatmapConfig,
  ElementClickListener,
} from '@elastic/charts';
import moment from 'moment';
import { HeatmapBrushEvent } from '@elastic/charts/dist/chart_types/heatmap/layout/types/config_types';
import { ExplorerSwimlaneProps } from './explorer_swimlane';

import { SwimLanePagination } from './swimlane_pagination';
import { ViewBySwimLaneData } from './explorer_utils';
import { ANOMALY_THRESHOLD, SEVERITY_COLORS } from '../../../common';
import { DeepPartial } from '../../../common/types/common';

/**
 * Ignore insignificant resize, e.g. browser scrollbar appearance.
 */
const RESIZE_IGNORED_DIFF_PX = 20;
const RESIZE_THROTTLE_TIME_MS = 500;
const CELL_HEIGHT = 30;
const LEGEND_HEIGHT = 70;

export function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData {
  return arg && arg.hasOwnProperty('cardinality');
}

/**
 * Anomaly swim lane container responsible for handling resizing, pagination and
 * providing swim lane vis with required props.
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

  // Holds the container height for previously fetched data
  const containerHeightRef = useRef<number>();

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

  const rowsCount = props?.swimlaneData?.laneLabels?.length ?? 0;

  const swimLanePoints = useMemo(() => {
    return props.swimlaneData.points
      .map((v) => ({ ...v, time: v.time * 1000 }))
      .filter((v) => v.value > 0);
  }, [props.swimlaneData.points]);

  const containerHeight = useMemo(() => {
    // Persists container height during loading to prevent page from jumping
    return isLoading ? containerHeightRef.current : rowsCount * CELL_HEIGHT + LEGEND_HEIGHT;
  }, [isLoading, rowsCount]);

  useEffect(() => {
    if (!isLoading) {
      containerHeightRef.current = containerHeight;
    }
  }, [isLoading, containerHeight]);

  const highlightedData = props.selection
    ? { x: props.selection.times.map((v) => v * 1000), y: props.selection.lanes }
    : undefined;

  const swimLaneConfig: DeepPartial<HeatmapConfig> = useMemo(
    () => ({
      onBrushEnd: (e: HeatmapBrushEvent) => {
        props.onCellsSelection({
          lanes: e.y as string[],
          times: e.x.map((v) => (v as number) / 1000),
          type: props.swimlaneType,
          viewByFieldName: props.swimlaneData.fieldName,
        });
      },
      grid: {
        cellHeight: {
          min: CELL_HEIGHT / 2,
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
        formatter: (v: number) => {
          props.timeBuckets.setInterval(`${props.swimlaneData.interval}s`);
          const a = props.timeBuckets.getScaledDateFormat();
          return moment(v).format(a);
        },
      },
    }),
    [props.swimlaneType, props.swimlaneData?.fieldName]
  );

  // @ts-ignore
  const onElementClick: ElementClickListener = useCallback(
    (e: HeatmapElementEvent[]) => {
      const cell = e[0][0];
      const startTime = (cell.datum.x as number) / 1000;
      const payload = {
        lanes: [String(cell.datum.y)],
        times: [startTime, startTime + props.swimlaneData.interval],
        type: props.swimlaneType,
        viewByFieldName: props.swimlaneData.fieldName,
      };
      props.onCellsSelection(payload);
    },
    [props.swimlaneType, props.swimlaneData?.fieldName, props.swimlaneData?.interval]
  );

  // A resize observer is required to compute the bucket span based on the chart width to fetch the data accordingly
  return (
    <EuiResizeObserver onResize={resizeHandler}>
      {(resizeRef) => (
        <EuiFlexGroup
          gutterSize={'none'}
          direction={'column'}
          style={{ width: '100%', height: '100%', overflow: 'hidden' }}
          ref={resizeRef}
          data-test-subj="mlSwimLaneContainer"
        >
          <EuiFlexItem
            style={{
              width: '100%',
              overflowY: 'auto',
              height: `${containerHeight}px`,
            }}
            grow={false}
          >
            {showSwimlane && !isLoading && (
              <Chart>
                <Settings
                  onElementClick={onElementClick}
                  showLegend
                  legendPosition="top"
                  xDomain={{
                    min: props.swimlaneData.earliest * 1000,
                    max: props.swimlaneData.latest * 1000,
                    minInterval: props.swimlaneData.interval * 1000,
                  }}
                />
                <Heatmap
                  id={id}
                  colorScale="threshold"
                  ranges={[
                    ANOMALY_THRESHOLD.LOW,
                    ANOMALY_THRESHOLD.WARNING,
                    ANOMALY_THRESHOLD.MINOR,
                    ANOMALY_THRESHOLD.MAJOR,
                    ANOMALY_THRESHOLD.CRITICAL,
                  ]}
                  colors={[
                    SEVERITY_COLORS.BLANK,
                    SEVERITY_COLORS.LOW,
                    SEVERITY_COLORS.WARNING,
                    SEVERITY_COLORS.MINOR,
                    SEVERITY_COLORS.MAJOR,
                    SEVERITY_COLORS.CRITICAL,
                  ]}
                  data={swimLanePoints}
                  xAccessor="time"
                  yAccessor="laneLabel"
                  valueAccessor="value"
                  highlightedData={highlightedData}
                  valueFormatter={(d) => d.toFixed(0.2)}
                  xScaleType="time"
                  ySortPredicate="dataIndex"
                  config={swimLaneConfig}
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
  );
};
