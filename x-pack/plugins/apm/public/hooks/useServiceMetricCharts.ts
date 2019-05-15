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

export function useServiceMetricCharts(
  urlParams: IUrlParams,
  agentName: string
) {
  const { serviceName, start, end, kuery } = urlParams;

  const { data = INITIAL_DATA, error, status } = useFetcher<
    MetricsChartsByAgentAPIResponse
  >(
    () => {
      if (serviceName && start && end) {
        return loadMetricsChartData({
          serviceName,
          agentName,
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
