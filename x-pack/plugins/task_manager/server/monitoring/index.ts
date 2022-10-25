/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Observable } from 'rxjs';
import { TaskManagerConfig } from '../config';
import {
  MonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
} from './monitoring_stats_stream';
import { TaskStore } from '../task_store';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import { ManagedConfiguration } from '../lib/create_managed_configuration';
import { EphemeralTaskLifecycle } from '../ephemeral_task_lifecycle';
import { CreateTaskCounter } from '../lib/create_task_counter';

export type { MonitoringStats, RawMonitoringStats } from './monitoring_stats_stream';
export {
  HealthStatus,
  summarizeMonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
} from './monitoring_stats_stream';

export function createMonitoringStats(
  taskStore: TaskStore,
  elasticsearchAndSOAvailability$: Observable<boolean>,
  config: TaskManagerConfig,
  managedConfig: ManagedConfiguration,
  logger: Logger,
  createTaskCounter: CreateTaskCounter,
  taskPollingLifecycle?: TaskPollingLifecycle,
  ephemeralTaskLifecycle?: EphemeralTaskLifecycle
): Observable<MonitoringStats> {
  return createMonitoringStatsStream(
    createAggregators(
      taskStore,
      elasticsearchAndSOAvailability$,
      config,
      managedConfig,
      logger,
      createTaskCounter,
      taskPollingLifecycle,
      ephemeralTaskLifecycle
    ),
    config
  );
}
