/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withApmSpan } from '../../../../utils/with_apm_span';
import { Setup } from '../../../../lib/helpers/setup_request';
import { getDuration } from './duration';
import { getColdStartDuration } from './cold_start_duration';
import { getMemoryChartData } from '../shared/memory';
import { getComputeUsage } from './compute_usage';
import { getActiveInstances } from './active_instances';
import { getColdStartCount } from './cold_start_count';

export function getServerlessAgentMetricCharts({
  environment,
  kuery,
  setup,
  serviceName,
  faasId,
  start,
  end,
  searchAggregatedTransactions,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  faasId?: string;
  start: number;
  end: number;
  searchAggregatedTransactions: boolean;
}) {
  return withApmSpan('get_serverless_agent_metric_charts', async () => {
    const options = {
      environment,
      kuery,
      setup,
      serviceName,
      start,
      end,
      faasId,
    };
    return await Promise.all([
      getDuration({ ...options, searchAggregatedTransactions }),
      getColdStartDuration(options),
      getColdStartCount(options),
      getMemoryChartData(options),
      getComputeUsage(options),
      getActiveInstances({ ...options, searchAggregatedTransactions }),
    ]);
  });
}
