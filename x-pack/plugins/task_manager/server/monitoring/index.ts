/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import { Observable } from 'rxjs';
import type { TaskManagerConfig } from '../config';
import { EphemeralTaskLifecycle } from '../ephemeral_task_lifecycle';
import type { ManagedConfiguration } from '../lib/create_managed_configuration';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import { TaskStore } from '../task_store';
import type { MonitoringStats } from './monitoring_stats_stream';
import { createAggregators, createMonitoringStatsStream } from './monitoring_stats_stream';

export {
  createAggregators,
  createMonitoringStatsStream,
  HealthStatus,
  MonitoringStats,
  RawMonitoringStats,
  summarizeMonitoringStats,
} from './monitoring_stats_stream';

export function createMonitoringStats(
  taskPollingLifecycle: TaskPollingLifecycle,
  ephemeralTaskLifecycle: EphemeralTaskLifecycle,
  taskStore: TaskStore,
  elasticsearchAndSOAvailability$: Observable<boolean>,
  config: TaskManagerConfig,
  managedConfig: ManagedConfiguration,
  logger: Logger
): Observable<MonitoringStats> {
  return createMonitoringStatsStream(
    createAggregators(
      taskPollingLifecycle,
      ephemeralTaskLifecycle,
      taskStore,
      elasticsearchAndSOAvailability$,
      config,
      managedConfig,
      logger
    ),
    config
  );
}
