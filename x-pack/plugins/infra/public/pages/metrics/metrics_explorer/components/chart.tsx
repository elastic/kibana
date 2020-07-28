/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

import { EuiTitle, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
  BrushEndListener,
} from '@elastic/charts';
import { first, last } from 'lodash';
import moment from 'moment';
import { MetricsExplorerSeries } from '../../../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerYAxisMode,
  MetricsExplorerChartOptions,
} from '../hooks/use_metrics_explorer_options';
import { euiStyled } from '../../../../../../observability/public';
import { createFormatterForMetric } from './helpers/create_formatter_for_metric';
import { MetricExplorerSeriesChart } from './series_chart';
import { MetricsExplorerChartContextMenu } from './chart_context_menu';
import { SourceQuery } from '../../../../graphql/types';
import { MetricsExplorerEmptyChart } from './empty_chart';
import { MetricsExplorerNoMetrics } from './no_metrics';
import { getChartTheme } from './helpers/get_chart_theme';
import { useKibanaUiSetting } from '../../../../utils/use_kibana_ui_setting';
import { calculateDomain } from './helpers/calculate_domain';
import { useKibana, useUiSetting } from '../../../../../../../../src/plugins/kibana_react/public';
import { ChartTitle } from './chart_title';

interface Props {
  title?: string | null;
  onFilter: (query: string) => void;
  width?: number | string;
  height?: number | string;
  options: MetricsExplorerOptions;
  chartOptions: MetricsExplorerChartOptions;
  series: MetricsExplorerSeries;
  source: SourceQuery.Query['source']['configuration'] | undefined;
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
  const uiCapabilities = useKibana().services.application?.capabilities;
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  const { metrics } = options;
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const handleTimeChange: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    onTimeChange(moment(from).toISOString(), moment(to).toISOString());
  };
  const dateFormatter = useMemo(
    () =>
      series.rows.length > 0
        ? niceTimeFormatter([
            (first(series.rows) as any).timestamp,
            (last(series.rows) as any).timestamp,
          ])
        : (value: number) => `${value}`,
    [series.rows]
  );
  const tooltipProps = {
    headerFormatter: useCallback(
      (data: TooltipValue) => moment(data.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
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
    <div style={{ padding: 24 }}>
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
      <div className="infrastructureChart" style={{ height, width }}>
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
            <Settings
              tooltip={tooltipProps}
              onBrushEnd={handleTimeChange}
              theme={getChartTheme(isDarkMode)}
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
