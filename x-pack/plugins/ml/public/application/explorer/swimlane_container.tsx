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
  TooltipValue,
} from '@elastic/charts';
import moment from 'moment';
import { HeatmapBrushEvent } from '@elastic/charts/dist/chart_types/heatmap/layout/types/config_types';

import { i18n } from '@kbn/i18n';
import { TooltipSettings } from '@elastic/charts/dist/specs/settings';
import { SwimLanePagination } from './swimlane_pagination';
import { AppStateSelectedCells, OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
import { ANOMALY_THRESHOLD, SEVERITY_COLORS } from '../../../common';
import { DeepPartial } from '../../../common/types/common';
import { TimeBuckets as TimeBucketsClass } from '../util/time_buckets';
import { SWIMLANE_TYPE, SwimlaneType } from './explorer_constants';
import { mlEscape } from '../util/string_utils';
import { FormattedTooltip } from '../components/chart_tooltip/chart_tooltip';
import { formatHumanReadableDateTime } from '../../../common/util/date_utils';
import { getFormattedSeverityScore } from '../../../common/util/anomaly_utils';

import './_explorer.scss';

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
 * Provides a custom tooltip for the anomaly swim lane chart.
 */
const SwimLaneTooltip = (fieldName?: string): FC<{ values: TooltipValue[] }> => ({ values }) => {
  const [value] = values;
  const [laneLabel, date] = value.label.split(' - ');

  // Display date using same format as Kibana visualizations.
  const formattedDate = formatHumanReadableDateTime(new Date(date).getTime());
  const tooltipData: TooltipValue[] = [{ label: formattedDate } as TooltipValue];

  if (fieldName !== undefined) {
    tooltipData.push({
      label: fieldName,
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
    value: value.formattedValue,
    color: value.color,
    // @ts-ignore
    seriesIdentifier: {
      key: laneLabel,
    },
    valueAccessor: 'anomaly_score',
  });

  return <FormattedTooltip tooltipData={tooltipData} />;
};

export interface ExplorerSwimlaneProps {
  filterActive?: boolean;
  maskAll?: boolean;
  timeBuckets: InstanceType<typeof TimeBucketsClass>;
  swimlaneData: OverallSwimlaneData | ViewBySwimLaneData;
  swimlaneType: SwimlaneType;
  selection?: AppStateSelectedCells;
  onCellsSelection: (payload?: AppStateSelectedCells) => void;
  'data-test-subj'?: string;
}

/**
 * Anomaly swim lane container responsible for handling resizing, pagination and
 * providing swim lane vis with required props.
 */
export const SwimlaneContainer: FC<
  ExplorerSwimlaneProps & {
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
  }
> = ({
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

  const showSwimlane = swimlaneData?.laneLabels?.length > 0 && swimlaneData?.points.length > 0;

  const isPaginationVisible =
    (showSwimlane || isLoading) &&
    swimlaneLimit !== undefined &&
    onPaginationChange &&
    fromPage &&
    perPage;

  const rowsCount = swimlaneData?.laneLabels?.length ?? 0;

  const swimLanePoints = useMemo(() => {
    const showFilterContext = filterActive === true && swimlaneType === SWIMLANE_TYPE.OVERALL;

    if (!swimlaneData?.points) {
      return [];
    }

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
      .filter((v) => v.value > 0);
  }, [swimlaneData?.points, filterActive, swimlaneType]);

  const containerHeight = useMemo(() => {
    // Persists container height during loading to prevent page from jumping
    return isLoading ? containerHeightRef.current : rowsCount * CELL_HEIGHT + LEGEND_HEIGHT;
  }, [isLoading, rowsCount]);

  useEffect(() => {
    if (!isLoading) {
      containerHeightRef.current = containerHeight;
    }
  }, [isLoading, containerHeight]);

  const highlightedData = useMemo(() => {
    if (!selection) return;

    if (
      (swimlaneType !== selection.type ||
        (swimlaneData.fieldName !== undefined &&
          swimlaneData.fieldName !== selection.viewByFieldName)) &&
      filterActive === false
    ) {
      // Not this swimlane which was selected.
      return;
    }

    return { x: selection.times.map((v) => v * 1000), y: selection.lanes };
  }, [selection, swimlaneType]);

  const swimLaneConfig: DeepPartial<HeatmapConfig> = useMemo(
    () =>
      showSwimlane
        ? {
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
                timeBuckets.setInterval(`${swimlaneData.interval}s`);
                const a = timeBuckets.getScaledDateFormat();
                return moment(v).format(a);
              },
            },
          }
        : {},
    [showSwimlane, swimlaneType, swimlaneData?.fieldName]
  );

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
    [swimlaneType, swimlaneData?.fieldName, swimlaneData?.interval]
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
            <div style={{ height: `${containerHeight}px` }}>
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
            </div>

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
