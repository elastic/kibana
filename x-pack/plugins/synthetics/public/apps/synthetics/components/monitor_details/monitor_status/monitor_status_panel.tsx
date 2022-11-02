/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { throttle } from 'lodash';
import { EuiPanel, useEuiTheme, EuiResizeObserver } from '@elastic/eui';
import { Chart, Settings, Heatmap, ScaleType } from '@elastic/charts';

import { scheduleToMinutes } from '../../../../../../common/lib/schedule_to_time';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import { usePingStatuses } from '../hooks/use_ping_statuses';
import { MonitorStatusHeader } from './monitor_status_header';
import { MonitorStatusCellTooltip } from './monitor_status_cell_tooltip';
import { MonitorStatusLegend } from './monitor_status_legend';
import { getMonitorStatusChartTheme } from './monitor_status_chart_theme';
import {
  getXAxisLabelFormatter,
  dateToMilli,
  createTimeBuckets,
  createStatusTimeBins,
  getColorBands,
  CHART_CELL_WIDTH,
  indexBinsByEndTime,
  getBrushData,
  MonitorStatusPanelProps,
} from './monitor_status_data';

export const MonitorStatusPanel = ({
  from = 'now-24h',
  to = 'now',
  brushable = true,
  periodCaption = undefined,
  showViewHistoryButton = false,
  onBrushed,
}: MonitorStatusPanelProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { monitor } = useSelectedMonitor();
  const monitorInterval = Math.max(3, monitor?.schedule ? scheduleToMinutes(monitor?.schedule) : 3);

  const fromMillis = dateToMilli(from);
  const toMillis = dateToMilli(to);
  const totalMinutes = Math.ceil(toMillis - fromMillis) / (1000 * 60);
  const pingStatuses = usePingStatuses({
    from: fromMillis,
    to: toMillis,
    size: Math.min(10000, Math.ceil((totalMinutes / monitorInterval) * 2)), // Acts as max size between from - to
    monitorInterval,
    lastRefresh,
  });

  const [binsAvailableByWidth, setBinsAvailableByWidth] = useState(50);
  const intervalByWidth = Math.floor(
    Math.max(monitorInterval, totalMinutes / binsAvailableByWidth)
  );

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
    return getMonitorStatusChartTheme(euiTheme, brushable);
  }, [euiTheme, brushable]);

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <MonitorStatusHeader
        from={from}
        to={to}
        brushable={brushable}
        periodCaption={periodCaption}
        showViewHistoryButton={showViewHistoryButton}
        onBrushed={onBrushed}
      />

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
                  onBrushed?.(getBrushData(brushArea));
                }}
              />
              <Heatmap
                id="monitor-details-monitor-status-chart"
                colorScale={{
                  type: 'bands',
                  bands: getColorBands(euiTheme, colorMode),
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

      <MonitorStatusLegend brushable={brushable} />
    </EuiPanel>
  );
};
