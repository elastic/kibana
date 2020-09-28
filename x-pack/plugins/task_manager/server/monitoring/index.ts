/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { Observable } from 'rxjs';
import { TaskManager } from '../task_manager';
import { TaskManagerConfig } from '../config';
import {
  MonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
} from './monitoring_stats_stream';

export {
  MonitoringStats,
  RawMonitoringStats,
  summarizeMonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
} from './monitoring_stats_stream';

export function createMonitoringStats(
  taskManager: TaskManager,
  config: TaskManagerConfig,
  logger: Logger
): Observable<MonitoringStats> {
  return createMonitoringStatsStream(createAggregators(taskManager, config, logger), config);
}
