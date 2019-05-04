/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsChartsByAgentAPIResponse } from '../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { loadMetricsChartData } from '../services/rest/apm/metrics';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useFetcher } from './useFetcher';

const INITIAL_DATA: MetricsChartsByAgentAPIResponse = {
  charts: []
};

export function useServiceMetricCharts(urlParams: IUrlParams) {
  const { serviceName, start, end, kuery } = urlParams;

  const { data = INITIAL_DATA, error, status } = useFetcher<
    MetricsChartsByAgentAPIResponse
  >(
    () => {
      if (serviceName && start && end) {
        return loadMetricsChartData({
          serviceName,
          // TODO: Remove hard-coded agent -- should we add agent name to url params or query for
          // agent based on service name in the back end to make this simpler in the client?
          agentName: serviceName === 'opbeans-java' ? 'java' : 'default',
          start,
          end,
          kuery
        });
      }
    },
    [serviceName, start, end, kuery]
  );

  return {
    data,
    status,
    error
  };
}
