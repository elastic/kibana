/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
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

export type { MonitoringStats, RawMonitoringStats } from './monitoring_stats_stream';
export {
  HealthStatus,
  summarizeMonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
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
