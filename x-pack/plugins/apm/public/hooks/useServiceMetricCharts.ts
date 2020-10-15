/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MetricsChartsByAgentAPIResponse } from '../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { useUiFilters } from '../context/UrlParamsContext';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';

const INITIAL_DATA: MetricsChartsByAgentAPIResponse = {
  charts: [],
};

export function useServiceMetricCharts(
  urlParams: IUrlParams,
  agentName?: string
) {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { start, end } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = INITIAL_DATA, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end && agentName) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/metrics/charts',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              agentName,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [serviceName, start, end, agentName, uiFilters]
  );

  return {
    data,
    status,
    error,
  };
}
