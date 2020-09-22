/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TaskManager } from '../task_manager';
import { AggregatedStatProvider } from './runtime_statistics_aggregator';
import { createWorkloadAggregator } from './workload_statistics';
import { TaskManagerConfig } from '../config';

export { AggregatedStatProvider, AggregatedStat } from './runtime_statistics_aggregator';

export function createAggregatedStatsStream(
  taskManager: TaskManager,
  config: TaskManagerConfig
): AggregatedStatProvider {
  return createWorkloadAggregator(taskManager, config.monitored_aggregated_stats_refresh_rate);
}
