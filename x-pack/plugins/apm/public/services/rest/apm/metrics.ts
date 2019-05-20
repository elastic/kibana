/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsChartsByAgentAPIResponse } from '../../../../server/lib/metrics/get_metrics_chart_data_by_agent';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadMetricsChartData({
  serviceName,
  agentName,
  start,
  end,
  kuery
}: {
  serviceName: string;
  agentName: string;
  start: string;
  end: string;
  kuery: string | undefined;
}) {
  return callApi<MetricsChartsByAgentAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/metrics/charts`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery),
      agentName
    }
  });
}
