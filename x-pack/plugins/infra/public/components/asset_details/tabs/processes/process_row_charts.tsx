/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, Chart, niceTimeFormatter, Position, Settings, Tooltip } from '@elastic/charts';
import {
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiLoadingChart,
  EuiText,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { first, last } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import { IconChartLine } from '@kbn/chart-icons';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { calculateDomain } from '../../../../pages/metrics/metrics_explorer/components/helpers/calculate_domain';
import { useProcessListRowChart } from '../../hooks/use_process_list_row_chart';
import { useTimelineChartTheme } from '../../../../utils/use_timeline_chart_theme';
import { MetricExplorerSeriesChart } from '../../../../pages/metrics/metrics_explorer/components/series_chart';
import { Color } from '../../../../../common/color_palette';
import { createFormatter } from '../../../../../common/formatters';
import { MetricsExplorerAggregation } from '../../../../../common/http_api';
import { Process } from './types';
import { MetricsExplorerChartType } from '../../../../../common/metrics_explorer_views/types';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { MetricNotAvailableExplanationTooltip } from '../../components/metric_not_available_explanation';

interface Props {
  command: string;
  hasCpuData: boolean;
  hasMemoryData: boolean;
}

const EmptyChartPlaceholder = ({ metricName }: { metricName: string }) => (
  <EmptyPlaceholder
    css={css`
       {
        height: 140px;
      }
    `}
    icon={IconChartLine}
    message={
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.infra.metrics.nodeDetails.processes.charts.noDataLabel"
            defaultMessage="No results found"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <MetricNotAvailableExplanationTooltip metricName={metricName} />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  />
);

export const ProcessRowCharts = ({ command, hasCpuData, hasMemoryData }: Props) => {
  const { request$ } = useRequestObservable();
  const { loading, error, response } = useProcessListRowChart(command, request$);

  const isLoading = loading || !response;

  const cpuChart = error ? (
    <EuiEmptyPrompt iconType="warning" title={<EuiText>{failedToLoadChart}</EuiText>} />
  ) : isLoading ? (
    <EuiLoadingChart />
  ) : hasCpuData ? (
    <ProcessChart timeseries={response!.cpu} color={Color.color2} label={cpuMetricLabel} />
  ) : (
    <EmptyChartPlaceholder metricName={cpuMetricLabel} />
  );
  const memoryChart = error ? (
    <EuiEmptyPrompt iconType="warning" title={<EuiText>{failedToLoadChart}</EuiText>} />
  ) : isLoading ? (
    <EuiLoadingChart />
  ) : hasMemoryData ? (
    <ProcessChart timeseries={response!.memory} color={Color.color0} label={memoryMetricLabel} />
  ) : (
    <EmptyChartPlaceholder metricName={memory} />
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
  const chartTheme = useTimelineChartTheme();
  const chartMetric = {
    color,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label,
  };

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

  const dataDomain = calculateDomain(timeseries, [chartMetric], false);
  const domain = dataDomain
    ? {
        max: dataDomain.max * 1.1, // add 10% headroom.
        min: dataDomain.min,
      }
    : { max: 0, min: 0 };

  return (
    <div
      css={css`
         {
          width: 100%;
          height: 140px;
        }
      `}
    >
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
          gridLine={{ visible: true }}
        />
        <Tooltip headerFormatter={({ value }) => moment(value).format('Y-MM-DD HH:mm:ss.SSS')} />
        <Settings
          baseTheme={chartTheme.baseTheme}
          theme={chartTheme.theme}
          locale={i18n.getLocale()}
        />
      </Chart>
    </div>
  );
};

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

const memory = i18n.translate('xpack.infra.metrics.nodeDetails.processes.expandedRowMemory', {
  defaultMessage: 'memory',
});

const failedToLoadChart = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.failedToLoadChart',
  {
    defaultMessage: 'Unable to load chart',
  }
);
