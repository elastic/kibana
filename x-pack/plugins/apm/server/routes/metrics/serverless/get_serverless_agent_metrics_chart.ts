/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../lib/helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getMemoryChartData } from '../by_agent/shared/memory';
import { getColdStartCountChart } from './get_cold_start_count_chart';
import { getColdStartDurationChart } from './get_cold_start_duration_chart';
import { getComputeUsageChart } from './get_compute_usage_chart';
import { getServerlessFunctionLatencyChart } from './get_serverless_function_latency_chart';

export function getServerlessAgentMetricsCharts({
  environment,
  kuery,
  setup,
  serviceName,
  start,
  end,
  serverlessFunctionName,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  start: number;
  end: number;
  serverlessFunctionName?: string;
}) {
  return withApmSpan('get_serverless_agent_metric_charts', async () => {
    const options = {
      environment,
      kuery,
      setup,
      serviceName,
      start,
      end,
      serverlessFunctionName,
    };
    return await Promise.all([
      getServerlessFunctionLatencyChart(options),
      getMemoryChartData(options),
      getColdStartDurationChart(options),
      getColdStartCountChart(options),
      getComputeUsageChart(options),
    ]);
  });
}
