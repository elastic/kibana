/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';

import { EuiPanel, useEuiTheme, EuiResizeObserver, EuiSpacer, EuiProgress } from '@elastic/eui';
import { Chart, Settings, Heatmap, ScaleType, Tooltip, LEGACY_LIGHT_THEME } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
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
  const initialSizeRef = useRef<HTMLDivElement | null>(null);
  const { loading, timeBins, handleResize, getTimeBinByXValue, xDomain, minsPerBin } =
    useMonitorStatusData({ from, to, initialSizeRef });

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

      <EuiSpacer size="m" />

      <div ref={initialSizeRef}>
        <EuiResizeObserver onResize={(e) => handleResize(e)}>
          {(resizeRef) => (
            <div ref={resizeRef}>
              {minsPerBin && (
                <Chart
                  size={{
                    height: 60,
                  }}
                >
                  <Tooltip
                    customTooltip={({ values }) => (
                      <MonitorStatusCellTooltip
                        timeBin={getTimeBinByXValue(values?.[0]?.datum?.x)}
                        isLoading={loading}
                      />
                    )}
                  />
                  <Settings
                    showLegend={false}
                    xDomain={xDomain}
                    theme={{ heatmap }}
                    // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
                    baseTheme={LEGACY_LIGHT_THEME}
                    onBrushEnd={(brushArea) => {
                      onBrushed?.(getBrushData(brushArea));
                    }}
                    locale={i18n.getLocale()}
                  />
                  <Heatmap
                    id="monitor-details-monitor-status-chart"
                    colorScale={{
                      type: 'bands',
                      bands: getColorBands(euiTheme, colorMode),
                    }}
                    data={timeBins}
                    xAccessor={({ end }) => end}
                    yAccessor={() => 'T'}
                    valueAccessor={(timeBin) => timeBin.value}
                    valueFormatter={(d) => d.toFixed(2)}
                    xAxisLabelFormatter={getXAxisLabelFormatter(minsPerBin)}
                    timeZone="UTC"
                    xScale={{
                      type: ScaleType.Time,
                      interval: {
                        type: 'calendar',
                        unit: 'm',
                        value: minsPerBin,
                      },
                    }}
                  />
                </Chart>
              )}
            </div>
          )}
        </EuiResizeObserver>
      </div>

      <MonitorStatusLegend brushable={brushable} />
      {loading && <EuiProgress size="xs" color="accent" />}
    </EuiPanel>
  );
};
