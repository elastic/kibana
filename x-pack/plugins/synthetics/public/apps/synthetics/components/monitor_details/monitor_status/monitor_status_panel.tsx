/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiPanel, useEuiTheme, EuiResizeObserver } from '@elastic/eui';
import { Chart, Settings, Heatmap, ScaleType } from '@elastic/charts';

import { MonitorStatusHeader } from './monitor_status_header';
import { MonitorStatusCellTooltip } from './monitor_status_cell_tooltip';
import { MonitorStatusLegend } from './monitor_status_legend';
import { getMonitorStatusChartTheme } from './monitor_status_chart_theme';
import {
  getXAxisLabelFormatter,
  getColorBands,
  getBrushData,
  MonitorStatusPanelProps,
} from './monitor_status_data';
import { useMonitorStatusData } from './use_monitor_status_data';

export const MonitorStatusPanel = ({
  from = 'now-24h',
  to = 'now',
  brushable = true,
  periodCaption = undefined,
  showViewHistoryButton = false,
  onBrushed,
}: MonitorStatusPanelProps) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { timeBins, handleResize, getTimeBinByXValue, xDomain, intervalByWidth } =
    useMonitorStatusData({ from, to });

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

      <EuiResizeObserver onResize={handleResize}>
        {(resizeRef) => (
          <div ref={resizeRef}>
            <Chart css={{ height: 60 }}>
              <Settings
                showLegend={false}
                xDomain={xDomain}
                tooltip={{
                  customTooltip: ({ values }) => (
                    <MonitorStatusCellTooltip timeBin={getTimeBinByXValue(values?.[0]?.datum?.x)} />
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
