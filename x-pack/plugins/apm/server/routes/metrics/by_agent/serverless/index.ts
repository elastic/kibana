/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { Setup } from '../../../../lib/helpers/setup_request';
import { getServerlessFunctionLatency } from './serverless_function_latency';
import { getColdStartDuration } from './cold_start_duration';
import { getMemoryChartData } from '../shared/memory';
import { getComputeUsage } from './compute_usage';
import { getActiveInstances } from './active_instances';
import { getColdStartCount } from './cold_start_count';
import { getSearchTransactionsEvents } from '../../../../lib/helpers/transactions';

export function getServerlessAgentMetricCharts({
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
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
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
      getServerlessFunctionLatency({
        ...options,
        searchAggregatedTransactions,
      }),
      getMemoryChartData(options),
      getColdStartDuration(options),
      getColdStartCount(options),
      getComputeUsage(options),
      getActiveInstances({ ...options, searchAggregatedTransactions }),
    ]);
  });
}
