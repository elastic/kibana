/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import { first, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexItem,
  EuiLoadingChart,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { Axis, Chart, Settings, Position, TooltipValue, niceTimeFormatter } from '@elastic/charts';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { createFormatter } from '../../../../../../../../common/formatters';
import { getChartTheme } from '../../../../../metrics_explorer/components/helpers/get_chart_theme';
import { calculateDomain } from '../../../../../metrics_explorer/components/helpers/calculate_domain';
import { MetricsExplorerChartType } from '../../../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricExplorerSeriesChart } from '../../../../../metrics_explorer/components/series_chart';
import { MetricsExplorerAggregation } from '../../../../../../../../common/http_api';
import { Color } from '../../../../../../../../common/color_palette';
import { useProcessListRowChart } from '../../../../hooks/use_process_list_row_chart';
import { Process } from './types';

interface Props {
  command: string;
}

export const ProcessRowCharts = ({ command }: Props) => {
  const { loading, error, response } = useProcessListRowChart(command);

  const isLoading = loading || !response;

  const cpuChart = error ? (
    <EuiEmptyPrompt iconType="alert" title={<EuiText>{failedToLoadChart}</EuiText>} />
  ) : isLoading ? (
    <EuiLoadingChart />
  ) : (
    <ProcessChart timeseries={response!.cpu} color={Color.color2} label={cpuMetricLabel} />
  );
  const memoryChart = error ? (
    <EuiEmptyPrompt iconType="alert" title={<EuiText>{failedToLoadChart}</EuiText>} />
  ) : isLoading ? (
    <EuiLoadingChart />
  ) : (
    <ProcessChart timeseries={response!.memory} color={Color.color0} label={memoryMetricLabel} />
  );

  return (
    <>
      <EuiFlexItem>
        <EuiDescriptionListTitle>{cpuMetricLabel}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{cpuChart}</EuiDescriptionListDescription>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionListTitle>{memoryMetricLabel}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>{memoryChart}</EuiDescriptionListDescription>
      </EuiFlexItem>
    </>
  );
};

interface ProcessChartProps {
  timeseries: Process['timeseries']['x'];
  color: Color;
  label: string;
}
const ProcessChart = ({ timeseries, color, label }: ProcessChartProps) => {
  const chartMetric = {
    color,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label,
  };
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');

  const dateFormatter = useMemo(() => {
    if (!timeseries) return () => '';
    const firstTimestamp = first(timeseries.rows)?.timestamp;
    const lastTimestamp = last(timeseries.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, [timeseries]);

  const yAxisFormatter = createFormatter('percent');

  const tooltipProps = {
    headerFormatter: (tooltipValue: TooltipValue) =>
      moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss.SSS'),
  };

  const dataDomain = calculateDomain(timeseries, [chartMetric], false);
  const domain = dataDomain
    ? {
        max: dataDomain.max * 1.1, // add 10% headroom.
        min: dataDomain.min,
      }
    : { max: 0, min: 0 };

  return (
    <ChartContainer>
      <Chart>
        <MetricExplorerSeriesChart
          type={MetricsExplorerChartType.area}
          metric={chartMetric}
          id="0"
          series={timeseries}
          stack={false}
        />
        <Axis
          id={'timestamp'}
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
        />
        <Axis
          id={'values'}
          position={Position.Left}
          tickFormat={yAxisFormatter}
          domain={domain}
          ticks={6}
          showGridLines
        />
        <Settings tooltip={tooltipProps} theme={getChartTheme(isDarkMode)} />
      </Chart>
    </ChartContainer>
  );
};

const ChartContainer = euiStyled.div`
  width: 100%;
  height: 140px;
`;

const cpuMetricLabel = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelCPU',
  {
    defaultMessage: 'CPU',
  }
);

const memoryMetricLabel = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.expandedRowLabelMemory',
  {
    defaultMessage: 'Memory',
  }
);

const failedToLoadChart = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.failedToLoadChart',
  {
    defaultMessage: 'Unable to load chart',
  }
);
