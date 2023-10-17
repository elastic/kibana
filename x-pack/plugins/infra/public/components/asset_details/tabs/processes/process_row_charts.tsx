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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { first, last } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import { IconChartLine } from '@kbn/chart-icons';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { css } from '@emotion/react';
import { calculateDomain } from '../../../../pages/metrics/metrics_explorer/components/helpers/calculate_domain';
import { useProcessListRowChart } from '../../hooks/use_process_list_row_chart';
import { useTimelineChartTheme } from '../../../../utils/use_timeline_chart_theme';
import { MetricExplorerSeriesChart } from '../../../../pages/metrics/metrics_explorer/components/series_chart';
import { Color } from '../../../../../common/color_palette';
import { createFormatter } from '../../../../../common/formatters';
import { MetricsExplorerAggregation } from '../../../../../common/http_api';
import { Process } from './types';
import { MetricsExplorerChartType } from '../../../../../common/metrics_explorer_views/types';

interface Props {
  command: string;
  hasCpuData: boolean;
}

export const ProcessRowCharts = ({ command, hasCpuData }: Props) => {
  const { loading, error, response } = useProcessListRowChart(command);

  const isLoading = loading || !response;

  const cpuChart = error ? (
    <EuiEmptyPrompt iconType="warning" title={<EuiText>{failedToLoadChart}</EuiText>} />
  ) : isLoading ? (
    <EuiLoadingChart />
  ) : hasCpuData ? (
    <ProcessChart timeseries={response!.cpu} color={Color.color2} label={cpuMetricLabel} />
  ) : (
    <div
      css={css`
         {
          height: 140px;
          display: flex;
          justify-content: center;
        }
      `}
    >
      <EmptyPlaceholder icon={IconChartLine} />
      {/* TODO Tooltip */}
    </div>
  );
  const memoryChart = error ? (
    <EuiEmptyPrompt iconType="warning" title={<EuiText>{failedToLoadChart}</EuiText>} />
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
        <Settings baseTheme={chartTheme.baseTheme} theme={chartTheme.theme} />
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

const failedToLoadChart = i18n.translate(
  'xpack.infra.metrics.nodeDetails.processes.failedToLoadChart',
  {
    defaultMessage: 'Unable to load chart',
  }
);
