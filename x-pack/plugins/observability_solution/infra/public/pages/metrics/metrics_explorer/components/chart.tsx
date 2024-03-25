/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BrushEndListener,
  Chart,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipProps,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiToolTip } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { first, last } from 'lodash';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useTimelineChartTheme } from '../../../../utils/use_timeline_chart_theme';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { MetricsExplorerSeries } from '../../../../../common/http_api/metrics_explorer';
import { MetricsSourceConfigurationProperties } from '../../../../../common/metrics_sources';
import { useKibanaUiSetting } from '../../../../utils/use_kibana_ui_setting';
import {
  MetricsExplorerChartOptions,
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerYAxisMode,
} from '../hooks/use_metrics_explorer_options';
import { MetricsExplorerChartContextMenu } from './chart_context_menu';
import { ChartTitle } from './chart_title';
import { MetricsExplorerEmptyChart } from './empty_chart';
import { calculateDomain } from './helpers/calculate_domain';
import { createFormatterForMetric } from './helpers/create_formatter_for_metric';
import { MetricsExplorerNoMetrics } from './no_metrics';
import { MetricExplorerSeriesChart } from './series_chart';

interface Props {
  title?: string | null;
  onFilter: (query: string) => void;
  width?: number | string;
  height?: number | string;
  options: MetricsExplorerOptions;
  chartOptions: MetricsExplorerChartOptions;
  series: MetricsExplorerSeries;
  source: MetricsSourceConfigurationProperties | undefined;
  timeRange: MetricsExplorerTimeOptions;
  onTimeChange: (start: string, end: string) => void;
}

export const MetricsExplorerChart = ({
  source,
  options,
  chartOptions,
  series,
  title,
  onFilter,
  height = 200,
  width = '100%',
  timeRange,
  onTimeChange,
}: Props) => {
  const {
    services: {
      application: { capabilities: uiCapabilities },
    },
  } = useKibanaContextForPlugin();

  const chartTheme = useTimelineChartTheme();
  const { metrics } = options;
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const handleTimeChange: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    onTimeChange(moment(from).toISOString(), moment(to).toISOString());
  };
  const dateFormatter = useMemo(() => {
    const firstRow = first(series.rows);
    const lastRow = last(series.rows);
    return firstRow && lastRow
      ? niceTimeFormatter([firstRow.timestamp, lastRow.timestamp])
      : (value: number) => `${value}`;
  }, [series.rows]);
  const tooltipProps: TooltipProps = {
    headerFormatter: useCallback<NonNullable<TooltipProps['headerFormatter']>>(
      ({ value }) => moment(value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
      [dateFormat]
    ),
  };
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const yAxisFormater = useCallback(createFormatterForMetric(first(metrics)), [options]);
  const dataDomain = calculateDomain(series, metrics, chartOptions.stack);
  const domain =
    chartOptions.yAxisMode === MetricsExplorerYAxisMode.fromZero
      ? { ...dataDomain, min: 0 }
      : dataDomain;

  return (
    <div style={{ padding: 24 }} data-test-subj="metricsExplorer-chart">
      {options.groupBy ? (
        <EuiTitle size="xs">
          <EuiFlexGroup alignItems="center">
            <ChartTitleContainer>
              <EuiToolTip content={title} anchorClassName="metricsExplorerTitleAnchor">
                <ChartTitle series={series} />
              </EuiToolTip>
            </ChartTitleContainer>
            <EuiFlexItem grow={false}>
              <MetricsExplorerChartContextMenu
                timeRange={timeRange}
                options={options}
                chartOptions={chartOptions}
                series={series}
                onFilter={onFilter}
                source={source}
                uiCapabilities={uiCapabilities}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
      ) : (
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <MetricsExplorerChartContextMenu
              options={options}
              chartOptions={chartOptions}
              series={series}
              source={source}
              timeRange={timeRange}
              uiCapabilities={uiCapabilities}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div className="metricsExplorerChart" style={{ height, width }}>
        {metrics.length && series.rows.length > 0 ? (
          <Chart>
            {metrics.map((metric, id) => (
              <MetricExplorerSeriesChart
                type={chartOptions.type}
                key={id}
                metric={metric}
                id={id}
                series={series}
                stack={chartOptions.stack}
              />
            ))}
            <Axis
              id={'timestamp'}
              position={Position.Bottom}
              showOverlappingTicks={true}
              tickFormat={dateFormatter}
            />
            <Axis
              id={'values'}
              position={Position.Left}
              tickFormat={yAxisFormater}
              domain={domain}
            />
            <Tooltip {...tooltipProps} />
            <Settings
              onBrushEnd={handleTimeChange}
              baseTheme={chartTheme.baseTheme}
              locale={i18n.getLocale()}
            />
          </Chart>
        ) : options.metrics.length > 0 ? (
          <MetricsExplorerEmptyChart />
        ) : (
          <MetricsExplorerNoMetrics />
        )}
      </div>
    </div>
  );
};

const ChartTitleContainer = euiStyled.div`
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  flex: 1 1 auto;
  margin: 12px;
`;
