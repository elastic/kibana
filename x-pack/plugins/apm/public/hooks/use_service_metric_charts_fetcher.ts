/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetricsChartsByAgentAPIResponse } from '../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useFetcher } from './use_fetcher';

const INITIAL_DATA: MetricsChartsByAgentAPIResponse = {
  charts: [],
};

export function useServiceMetricChartsFetcher({
  serviceNodeName,
}: {
  serviceNodeName: string | undefined;
}) {
  const { urlParams, uiFilters } = useUrlParams();
  const { agentName } = useApmServiceContext();
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end } = urlParams;
  const { data = INITIAL_DATA, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && agentName) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/metrics/charts',
          params: {
            path: { serviceName },
            query: {
              serviceNodeName,
              start,
              end,
              agentName,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [serviceName, start, end, agentName, serviceNodeName, uiFilters]
  );

  return {
    data,
    status,
    error,
  };
}
