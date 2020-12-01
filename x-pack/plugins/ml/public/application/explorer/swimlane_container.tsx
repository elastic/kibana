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
  ElementClickListener,
  TooltipValue,
  HeatmapSpec,
} from '@elastic/charts';
import moment from 'moment';
import { HeatmapBrushEvent } from '@elastic/charts/dist/chart_types/heatmap/layout/types/config_types';

import { i18n } from '@kbn/i18n';
import { TooltipSettings } from '@elastic/charts/dist/specs/settings';
import { SwimLanePagination } from './swimlane_pagination';
import { AppStateSelectedCells, OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { ANOMALY_THRESHOLD, SEVERITY_COLORS } from '../../../common';
import { TimeBuckets as TimeBucketsClass } from '../util/time_buckets';
import { SWIMLANE_TYPE, SwimlaneType } from './explorer_constants';
import { mlEscape } from '../util/string_utils';
import { FormattedTooltip } from '../components/chart_tooltip/chart_tooltip';
import { formatHumanReadableDateTime } from '../../../common/util/date_utils';
import { getFormattedSeverityScore } from '../../../common/util/anomaly_utils';

import './_explorer.scss';
import { EMPTY_FIELD_VALUE_LABEL } from '../timeseriesexplorer/components/entity_control/entity_control';
import { useUiSettings } from '../contexts/kibana';

/**
 * Ignore insignificant resize, e.g. browser scrollbar appearance.
 */
const RESIZE_IGNORED_DIFF_PX = 20;
const RESIZE_THROTTLE_TIME_MS = 500;
const CELL_HEIGHT = 30;
const LEGEND_HEIGHT = 34;
const Y_AXIS_HEIGHT = 24;

export function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData {
  return arg && arg.hasOwnProperty('cardinality');
}

/**
 * Provides a custom tooltip for the anomaly swim lane chart.
 */
const SwimLaneTooltip = (fieldName?: string): FC<{ values: TooltipValue[] }> => ({ values }) => {
  const tooltipData: TooltipValue[] = [];

  if (values.length === 1 && fieldName) {
    // Y-axis tooltip for viewBy swim lane
    const [yAxis] = values;
    // @ts-ignore
    tooltipData.push({ skipHeader: true });
    tooltipData.push({
      label: fieldName,
      value: yAxis.value,
      // @ts-ignore
      seriesIdentifier: {
        key: yAxis.value,
      },
    });
  } else if (values.length === 3) {
    // Cell tooltip
    const [xAxis, yAxis, cell] = values;

    // Display date using same format as Kibana visualizations.
    const formattedDate = formatHumanReadableDateTime(parseInt(xAxis.value, 10));
    tooltipData.push({ label: formattedDate } as TooltipValue);

    if (fieldName !== undefined) {
      tooltipData.push({
        label: fieldName,
        value: yAxis.value,
        // @ts-ignore
        seriesIdentifier: {
          key: yAxis.value,
        },
      });
    }
    tooltipData.push({
      label: i18n.translate('xpack.ml.explorer.swimlane.maxAnomalyScoreLabel', {
        defaultMessage: 'Max anomaly score',
      }),
      value: cell.formattedValue,
      color: cell.color,
      // @ts-ignore
      seriesIdentifier: {
        key: cell.value,
      },
    });
  }

  return <FormattedTooltip tooltipData={tooltipData} />;
};

export interface SwimlaneProps {
  filterActive?: boolean;
  maskAll?: boolean;
  timeBuckets: InstanceType<typeof TimeBucketsClass>;
  swimlaneData: OverallSwimlaneData | ViewBySwimLaneData;
  swimlaneType: SwimlaneType;
  selection?: AppStateSelectedCells;
  onCellsSelection: (payload?: AppStateSelectedCells) => void;
  'data-test-subj'?: string;
  onResize: (width: number) => void;
  fromPage?: number;
  perPage?: number;
  swimlaneLimit?: number;
  onPaginationChange?: (arg: { perPage?: number; fromPage?: number }) => void;
  isLoading: boolean;
  noDataWarning: string | JSX.Element | null;
  /**
   * Unique id of the chart
   */
  id: string;
  /**
   * Enables/disables timeline on the X-axis.
   */
  showTimeline?: boolean;
}

/**
 * Anomaly swim lane container responsible for handling resizing, pagination and
 * providing swim lane vis with required props.
 */
export const SwimlaneContainer: FC<SwimlaneProps> = ({
  id,
  onResize,
  perPage,
  fromPage,
  swimlaneLimit,
  onPaginationChange,
  isLoading,
  noDataWarning,
  filterActive,
  swimlaneData,
  swimlaneType,
  selection,
  onCellsSelection,
  timeBuckets,
  maskAll,
  showTimeline = true,
  'data-test-subj': dataTestSubj,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

  const isDarkTheme = !!useUiSettings().get('theme:darkMode');

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

  const swimLanePoints = useMemo(() => {
    const showFilterContext = filterActive === true && swimlaneType === SWIMLANE_TYPE.OVERALL;

    if (!swimlaneData?.points) {
      return [];
    }

    const sortedLaneValues = swimlaneData.laneLabels;

    return swimlaneData.points
      .map((v) => {
        const formatted = { ...v, time: v.time * 1000 };
        if (showFilterContext) {
          formatted.laneLabel = i18n.translate('xpack.ml.explorer.overallSwimlaneUnfilteredLabel', {
            defaultMessage: '{label} (unfiltered)',
            values: { label: mlEscape(v.laneLabel) },
          });
        }
        return formatted;
      })
      .sort((a, b) => {
        let aIndex = sortedLaneValues.indexOf(a.laneLabel);
        let bIndex = sortedLaneValues.indexOf(b.laneLabel);
        aIndex = aIndex > -1 ? aIndex : sortedLaneValues.length;
        bIndex = bIndex > -1 ? bIndex : sortedLaneValues.length;
        return aIndex - bIndex;
      })
      .filter((v) => v.value > 0);
  }, [swimlaneData?.points, filterActive, swimlaneType, swimlaneData?.laneLabels]);

  const showSwimlane = swimlaneData?.laneLabels?.length > 0 && swimLanePoints.length > 0;

  const isPaginationVisible =
    (showSwimlane || isLoading) &&
    swimlaneLimit !== undefined &&
    onPaginationChange &&
    fromPage &&
    perPage;

  const rowsCount = swimlaneData?.laneLabels?.length ?? 0;

  const containerHeight = useMemo(() => {
    // Persists container height during loading to prevent page from jumping
    return isLoading
      ? containerHeightRef.current
      : // TODO update when elastic charts X label will be fixed
        rowsCount * CELL_HEIGHT + LEGEND_HEIGHT + (true ? Y_AXIS_HEIGHT : 0);
  }, [isLoading, rowsCount, showTimeline]);

  useEffect(() => {
    if (!isLoading) {
      containerHeightRef.current = containerHeight;
    }
  }, [isLoading, containerHeight]);

  const highlightedData: HeatmapSpec['highlightedData'] = useMemo(() => {
    if (!selection || !swimlaneData) return;

    if (
      (swimlaneType !== selection.type ||
        (swimlaneData?.fieldName !== undefined &&
          swimlaneData.fieldName !== selection.viewByFieldName)) &&
      filterActive === false
    ) {
      // Not this swim lane which was selected.
      return;
    }

    return { x: selection.times.map((v) => v * 1000), y: selection.lanes };
  }, [selection, swimlaneData, swimlaneType]);

  const swimLaneConfig: HeatmapSpec['config'] = useMemo(() => {
    if (!showSwimlane) return {};

    return {
      onBrushEnd: (e: HeatmapBrushEvent) => {
        onCellsSelection({
          lanes: e.y as string[],
          times: e.x.map((v) => (v as number) / 1000),
          type: swimlaneType,
          viewByFieldName: swimlaneData.fieldName,
        });
      },
      grid: {
        cellHeight: {
          min: CELL_HEIGHT,
          max: CELL_HEIGHT,
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
        formatter: (laneLabel: string) => {
          return laneLabel === '' ? EMPTY_FIELD_VALUE_LABEL : laneLabel;
        },
      },
      xAxisLabel: {
        visible: true,
        // eui color subdued
        fill: `#98A2B3`,
        formatter: (v: number) => {
          timeBuckets.setInterval(`${swimlaneData.interval}s`);
          const scaledDateFormat = timeBuckets.getScaledDateFormat();
          return moment(v).format(scaledDateFormat);
        },
      },
      brushMask: {
        fill: isDarkTheme ? 'rgb(30,31,35,80%)' : 'rgb(247,247,247,50%)',
      },
      brushArea: {
        stroke: isDarkTheme ? 'rgb(255, 255, 255)' : 'rgb(105, 112, 125)',
      },
      maxLegendHeight: LEGEND_HEIGHT,
      timeZone: 'UTC',
    };
  }, [
    showSwimlane,
    swimlaneType,
    swimlaneData?.fieldName,
    isDarkTheme,
    timeBuckets,
    onCellsSelection,
  ]);

  // @ts-ignore
  const onElementClick: ElementClickListener = useCallback(
    (e: HeatmapElementEvent[]) => {
      const cell = e[0][0];
      const startTime = (cell.datum.x as number) / 1000;
      const payload = {
        lanes: [String(cell.datum.y)],
        times: [startTime, startTime + swimlaneData.interval],
        type: swimlaneType,
        viewByFieldName: swimlaneData.fieldName,
      };
      onCellsSelection(payload);
    },
    [swimlaneType, swimlaneData?.fieldName, swimlaneData?.interval, onCellsSelection]
  );

  const tooltipOptions: TooltipSettings = useMemo(
    () => ({
      placement: 'auto',
      fallbackPlacements: ['left'],
      boundary: 'chart',
      customTooltip: SwimLaneTooltip(swimlaneData?.fieldName),
    }),
    [swimlaneData?.fieldName]
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
            }}
            grow={false}
          >
            <div
              style={{ height: `${containerHeight}px`, position: 'relative' }}
              data-test-subj={dataTestSubj}
            >
              {showSwimlane && !isLoading && (
                <Chart className={'mlSwimLaneContainer'}>
                  <Settings
                    onElementClick={onElementClick}
                    showLegend
                    legendPosition="top"
                    xDomain={{
                      min: swimlaneData.earliest * 1000,
                      max: swimlaneData.latest * 1000,
                      minInterval: swimlaneData.interval * 1000,
                    }}
                    tooltip={tooltipOptions}
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
                    valueFormatter={getFormattedSeverityScore}
                    xScaleType="time"
                    ySortPredicate="dataIndex"
                    config={swimLaneConfig}
                  />
                </Chart>
              )}

              {isLoading && (
                <EuiText
                  textAlign={'center'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                  }}
                >
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
            </div>
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
