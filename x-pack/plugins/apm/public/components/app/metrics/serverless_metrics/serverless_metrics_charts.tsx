/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { isEmpty, keyBy } from 'lodash';
import React, { useMemo } from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { MetricsChart } from '../../../shared/charts/metrics_chart';

interface Props {
  serverlessFunctionName?: string;
}

export function ServerlessMetricsCharts({ serverlessFunctionName }: Props) {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { serviceName } = useApmServiceContext();

  const { data = { charts: [] }, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/metrics/serverless/charts',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              kuery,
              environment,
              start,
              end,
              serverlessFunctionName,
            },
          },
        }
      );
    },
    [kuery, environment, serviceName, start, end, serverlessFunctionName]
  );

  const { firstLineCharts, secondLineCharts } = useMemo(() => {
    const chartsByKey = keyBy(data.charts, 'key');
    if (isEmpty(chartsByKey)) {
      return { firstLineCharts: [], secondLineCharts: [] };
    }

    return {
      firstLineCharts: [
        chartsByKey.avg_duration,
        chartsByKey.cold_start_duration,
        chartsByKey.cold_start_count,
      ],
      secondLineCharts: [
        chartsByKey.compute_usage,
        chartsByKey.memory_usage_chart,
      ],
    };
  }, [data]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGrid columns={3} gutterSize="m">
          {firstLineCharts.map((chart) => (
            <EuiFlexItem key={chart.key}>
              <EuiPanel hasBorder={true}>
                <MetricsChart
                  start={start}
                  end={end}
                  chart={chart}
                  fetchStatus={status}
                />
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={2} gutterSize="m">
          {secondLineCharts.map((chart) => (
            <EuiFlexItem key={chart.key}>
              <EuiPanel hasBorder={true}>
                <MetricsChart
                  start={start}
                  end={end}
                  chart={chart}
                  fetchStatus={status}
                />
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
