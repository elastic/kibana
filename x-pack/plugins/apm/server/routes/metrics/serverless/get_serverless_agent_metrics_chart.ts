/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSearchTransactionsEvents } from '../../../lib/helpers/transactions';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getMemoryChartData } from '../by_agent/shared/memory';
import { getColdStartCountChart } from './get_cold_start_count_chart';
import { getColdStartDurationChart } from './get_cold_start_duration_chart';
import { getComputeUsageChart } from './get_compute_usage_chart';
import { getServerlessFunctionLatencyChart } from './get_serverless_function_latency_chart';
import { APMConfig } from '../../..';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export function getServerlessAgentMetricsCharts({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  start,
  end,
  serverlessId,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  start: number;
  end: number;
  serverlessId?: string;
}) {
  return withApmSpan('get_serverless_agent_metric_charts', async () => {
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    const options = {
      environment,
      kuery,
      apmEventClient,
      config,
      serviceName,
      start,
      end,
      serverlessId,
    };
    return await Promise.all([
      getServerlessFunctionLatencyChart({
        ...options,
        searchAggregatedTransactions,
      }),
      getMemoryChartData(options),
      getColdStartDurationChart(options),
      getColdStartCountChart(options),
      getComputeUsageChart(options),
    ]);
  });
}
