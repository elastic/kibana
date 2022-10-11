/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { Setup } from '../../../../lib/helpers/setup_request';
import { getServerlessFunctionLatencyChart } from './get_serverless_function_latency_chart';
import { getColdStartDurationChart } from './get_cold_start_duration_chart';
import { getMemoryChartData } from '../shared/memory';
import { getComputeUsageChart } from './get_compute_usage_chart';
import { getActiveInstancesChart } from './get_active_instances_chart';
import { getColdStartCountChart } from './get_cold_start_count_chart';
import { getSearchAggregatedTransactions } from '../../../../lib/helpers/transactions';

export function getServerlessAgentMetricsCharts({
  environment,
  kuery,
  setup,
  serviceName,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
}) {
  return withApmSpan('get_serverless_agent_metric_charts', async () => {
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    const options = {
      environment,
      kuery,
      setup,
      serviceName,
      start,
      end,
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
      getActiveInstancesChart({ ...options, searchAggregatedTransactions }),
    ]);
  });
}
