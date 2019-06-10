/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { EuiTitle, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Chart, Axis, Position, timeFormatter, getAxisId, Settings } from '@elastic/charts';
import '@elastic/charts/dist/style.css';
import { first } from 'lodash';
import { niceTimeFormatByDay } from '@elastic/charts/dist/utils/data/formatters';
import moment from 'moment';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import euiStyled from '../../../../../common/eui_styled_components';
import { createFormatterForMetric } from './helpers/create_formatter_for_metric';
import { MetricLineSeries } from './line_series';
import { MetricsExplorerChartContextMenu } from './chart_context_menu';
import { SourceQuery } from '../../graphql/types';
import { MetricsExplorerEmptyChart } from './empty_chart';
import { MetricsExplorerNoMetrics } from './no_metrics';

interface Props {
  intl: InjectedIntl;
  title?: string | null;
  onFilter: (query: string) => void;
  width?: number | string;
  height?: number | string;
  options: MetricsExplorerOptions;
  series: MetricsExplorerSeries;
  source: SourceQuery.Query['source']['configuration'] | undefined;
  timeRange: MetricsExplorerTimeOptions;
  onTimeChange: (start: string, end: string) => void;
}

const dateFormatter = timeFormatter(niceTimeFormatByDay(1));

export const MetricsExplorerChart = injectI18n(
  ({
    source,
    options,
    series,
    title,
    onFilter,
    height = 200,
    width = '100%',
    timeRange,
    onTimeChange,
  }: Props) => {
    const { metrics } = options;
    const handleTimeChange = (from: number, to: number) => {
      onTimeChange(moment(from).toISOString(), moment(to).toISOString());
    };
    const yAxisFormater = useCallback(createFormatterForMetric(first(metrics)), [options]);
    return (
      <React.Fragment>
        {options.groupBy ? (
          <EuiTitle size="xs">
            <EuiFlexGroup alignItems="center">
              <ChartTitle>
                <EuiToolTip content={title}>
                  <span>{title}</span>
                </EuiToolTip>
              </ChartTitle>
              <EuiFlexItem grow={false}>
                <MetricsExplorerChartContextMenu
                  timeRange={timeRange}
                  options={options}
                  series={series}
                  onFilter={onFilter}
                  source={source}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
        ) : (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <MetricsExplorerChartContextMenu
                options={options}
                series={series}
                source={source}
                timeRange={timeRange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <div style={{ height, width }}>
          {series.rows.length > 0 ? (
            <Chart>
              {metrics.map((metric, id) => (
                <MetricLineSeries key={id} metric={metric} id={id} series={series} />
              ))}
              <Axis
                id={getAxisId('timestamp')}
                position={Position.Bottom}
                showOverlappingTicks={true}
                tickFormat={dateFormatter}
              />
              <Axis id={getAxisId('values')} position={Position.Left} tickFormat={yAxisFormater} />
              <Settings onBrushEnd={handleTimeChange} />
            </Chart>
          ) : options.metrics.length > 0 ? (
            <MetricsExplorerEmptyChart />
          ) : (
            <MetricsExplorerNoMetrics />
          )}
        </div>
      </React.Fragment>
    );
  }
);

const ChartTitle = euiStyled.div`
            width: 100%
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
            flex: 1 1 auto;
            margin: 12px;
          `;
