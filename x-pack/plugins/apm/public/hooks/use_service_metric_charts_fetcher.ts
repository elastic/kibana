/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetricsChartsByAgentAPIResponse } from '../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useFetcher } from './use_fetcher';
import { useTimeRange } from './use_time_range';
import { useApmParams } from './use_apm_params';

const INITIAL_DATA: MetricsChartsByAgentAPIResponse = {
  charts: [],
};

export function useServiceMetricChartsFetcher({
  serviceNodeName,
  kuery,
  environment,
}: {
  serviceNodeName: string | undefined;
  kuery: string;
  environment: string;
}) {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { agentName, serviceName } = useApmServiceContext();

  const {
    data = INITIAL_DATA,
    error,
    status,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && agentName) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/metrics/charts',
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              serviceNodeName,
              start,
              end,
              agentName,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, agentName, serviceNodeName]
  );

  return {
    data,
    status,
    error,
  };
}
