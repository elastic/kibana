/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { throttle } from 'lodash';
import { css } from '@emotion/css';
import {
  EuiPanel,
  useEuiTheme,
  EuiResizeObserver,
  EuiThemeComputed,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiIcon,
} from '@elastic/eui';

import {
  Chart,
  Settings,
  Heatmap,
  ScaleType,
  HeatmapStyle,
  RecursivePartial,
} from '@elastic/charts';

import { scheduleToMinutes } from '../../../../../../common/lib/schedule_to_time';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { usePingStatuses } from '../hooks/use_ping_statuses';
import { MonitorStatusCellTooltip } from './monitor_status_cell_tooltip';
import {
  getXAxisLabelFormatter,
  dateToMilli,
  createTimeBuckets,
  createStatusTimeBins,
  getColorBands,
  CHART_CELL_WIDTH,
  indexBinsByEndTime,
  SUCCESS_VIZ_COLOR,
  getSkippedVizColor,
  getErrorVizColor,
  DANGER_VIZ_COLOR,
} from './monitor_status_data';
import * as labels from './labels';

interface MonitorStatusPanelProps {
  /**
   * Either epoch in millis or Kibana date range e.g. 'now-24h'
   */
  from: string | number;

  /**
   * Either epoch in millis or Kibana date range e.g. 'now'
   */
  to: string | number;
  brushable: boolean; // Whether to allow brushing on the chart to allow zooming in on data.
  periodCaption?: string; // e.g. Last 24 Hours
  showViewHistoryButton?: boolean;
  onBrushed?: (timeBounds: { from: number; to: number }) => void;
}

export const MonitorStatusPanel = ({
  from = 'now-24h',
  to = 'now',
  brushable = true,
  periodCaption = undefined,
  showViewHistoryButton = false,
  onBrushed,
}: MonitorStatusPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { monitor } = useSelectedMonitor();
  const monitorInterval = Math.max(
    10,
    monitor?.schedule ? scheduleToMinutes(monitor?.schedule) : 10
  );

  const fromMillis = dateToMilli(from);
  const toMillis = dateToMilli(to);
  const pingStatuses = usePingStatuses({
    from,
    to,
    size: 24 * Math.ceil(60 / monitorInterval),
  });

  const [binsAvailableByWidth, setBinsAvailableByWidth] = useState(50);
  const intervalByWidth = Math.floor((24 * 60) / binsAvailableByWidth);

  // Disabling deps warning as we wanna throttle the callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      setBinsAvailableByWidth(Math.floor(e.width / CHART_CELL_WIDTH));
    }, 500),
    []
  );

  const { timeBins, timeBinsByEndTime, xDomain } = useMemo(() => {
    const timeBuckets = createTimeBuckets(intervalByWidth, fromMillis, toMillis);
    const bins = createStatusTimeBins(timeBuckets, pingStatuses);
    const indexedBins = indexBinsByEndTime(bins);

    const timeDomain = {
      min: bins?.[0]?.end ?? fromMillis,
      max: bins?.[bins.length - 1]?.end ?? toMillis,
    };

    return { timeBins: bins, timeBinsByEndTime: indexedBins, xDomain: timeDomain };
  }, [intervalByWidth, pingStatuses, fromMillis, toMillis]);

  const heatmap = useMemo(() => {
    return getChartTheme(euiTheme, brushable);
  }, [euiTheme, brushable]);

  const isLast24Hours = from === 'now-24h' && to === 'now';
  const periodCaptionText = !!periodCaption
    ? periodCaption
    : isLast24Hours
    ? labels.LAST_24_HOURS_LABEL
    : '';

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup
        direction="row"
        alignItems="baseline"
        css={css`
          margin-bottom: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{labels.STATUS_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {periodCaptionText ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color={euiTheme.colors.subduedText}>
              {periodCaptionText}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={true} />

        {showViewHistoryButton ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color={euiTheme.colors.subduedText}>
              <EuiButtonEmpty
                data-test-subj="monitorStatusChartViewHistoryButton"
                size="xs"
                iconType="list"
              >
                {labels.VIEW_HISTORY_LABEL}
              </EuiButtonEmpty>
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <EuiResizeObserver onResize={resizeHandler}>
        {(resizeRef) => (
          <div ref={resizeRef}>
            <Chart css={{ height: 60 }}>
              <Settings
                showLegend={false}
                xDomain={xDomain}
                tooltip={{
                  customTooltip: ({ values }) => (
                    <MonitorStatusCellTooltip
                      timeBin={timeBinsByEndTime.get(values?.[0]?.datum?.x)}
                    />
                  ),
                }}
                theme={{ heatmap }}
                onBrushEnd={(brushArea) => {
                  onBrushed?.({ from: Number(brushArea.x?.[0]), to: Number(brushArea.x?.[0]) });
                }}
              />
              <Heatmap
                id="monitor-details-monitor-status-chart"
                colorScale={{
                  type: 'bands',
                  bands: getColorBands(euiTheme),
                }}
                data={timeBins}
                xAccessor={(timeBin) => timeBin.end}
                yAccessor={() => 'T'}
                valueAccessor={(timeBin) => timeBin.value}
                valueFormatter={(d) => d.toFixed(2)}
                xAxisLabelFormatter={getXAxisLabelFormatter(intervalByWidth)}
                timeZone="UTC"
                xScale={{
                  type: ScaleType.Time,
                  interval: {
                    type: 'calendar',
                    unit: 'm',
                    value: intervalByWidth,
                  },
                }}
              />
            </Chart>
          </div>
        )}
      </EuiResizeObserver>

      <ChartLegend />
    </EuiPanel>
  );
};

const ChartLegend = () => {
  const { euiTheme } = useEuiTheme();

  const LegendItem = useMemo(() => {
    return ({
      color,
      label,
      iconType = 'dot',
    }: {
      color: string;
      label: string;
      iconType?: string;
    }) => (
      <EuiFlexItem
        css={css`
          display: flex;
          flex-direction: row;
          gap: 2px;
        `}
        grow={false}
      >
        <EuiIcon type={iconType} color={color} />
        <EuiText size="xs">{label}</EuiText>
      </EuiFlexItem>
    );
  }, []);

  return (
    <EuiFlexGroup>
      <LegendItem color={SUCCESS_VIZ_COLOR} label={labels.COMPLETE_LABEL} />
      <LegendItem color={DANGER_VIZ_COLOR} label={labels.FAILED_LABEL} />
      <LegendItem color={getSkippedVizColor(euiTheme)} label={labels.SKIPPED_LABEL} />
      <LegendItem color={getErrorVizColor(euiTheme)} label={labels.ERROR_LABEL} iconType="alert" />
    </EuiFlexGroup>
  );
};

function getChartTheme(
  euiTheme: EuiThemeComputed,
  brushable: boolean
): RecursivePartial<HeatmapStyle> {
  return {
    grid: {
      cellHeight: {
        min: 20,
      },
      stroke: {
        width: 0,
        color: 'transparent',
      },
    },
    maxRowHeight: 30,
    maxColumnWidth: CHART_CELL_WIDTH,
    cell: {
      maxWidth: 'fill',
      maxHeight: 3,
      label: {
        visible: false,
      },
      border: {
        stroke: 'transparent',
        strokeWidth: 0.5,
      },
    },
    xAxisLabel: {
      visible: true,
      fontSize: 10,
      fontFamily: euiTheme.font.family,
      fontWeight: euiTheme.font.weight.light,
      textColor: euiTheme.colors.subduedText,
    },
    yAxisLabel: {
      visible: false,
    },
    brushTool: {
      visible: brushable,
      fill: euiTheme.colors.darkShade,
    },
  };
}
