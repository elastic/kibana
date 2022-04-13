/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { MonitoredHealth } from '../routes/health';
import { TaskManagerUsage } from './types';

export function createTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  ephemeralTasksEnabled: boolean,
  ephemeralRequestCapacity: number,
  excludeTaskTypes: string[]
) {
  let lastMonitoredHealth: MonitoredHealth | null = null;
  monitoringStats$.subscribe((health) => {
    lastMonitoredHealth = health;
  });

  return usageCollection.makeUsageCollector<TaskManagerUsage>({
    type: 'task_manager',
    isReady: async () => {
      return Boolean(lastMonitoredHealth);
    },
    fetch: async () => {
      return {
        ephemeral_tasks_enabled: ephemeralTasksEnabled,
        ephemeral_request_capacity: ephemeralRequestCapacity,
        ephemeral_stats: {
          status: lastMonitoredHealth?.stats.ephemeral?.status ?? '',
          queued_tasks: {
            p50: lastMonitoredHealth?.stats.ephemeral?.value.queuedTasks.p50 ?? 0,
            p90: lastMonitoredHealth?.stats.ephemeral?.value.queuedTasks.p90 ?? 0,
            p95: lastMonitoredHealth?.stats.ephemeral?.value.queuedTasks.p95 ?? 0,
            p99: lastMonitoredHealth?.stats.ephemeral?.value.queuedTasks.p99 ?? 0,
          },
          load: {
            p50: lastMonitoredHealth?.stats.ephemeral?.value.load.p50 ?? 0,
            p90: lastMonitoredHealth?.stats.ephemeral?.value.load.p90 ?? 0,
            p95: lastMonitoredHealth?.stats.ephemeral?.value.load.p95 ?? 0,
            p99: lastMonitoredHealth?.stats.ephemeral?.value.load.p99 ?? 0,
          },
          executions_per_cycle: {
            p50: lastMonitoredHealth?.stats.ephemeral?.value.executionsPerCycle.p50 ?? 0,
            p90: lastMonitoredHealth?.stats.ephemeral?.value.executionsPerCycle.p90 ?? 0,
            p95: lastMonitoredHealth?.stats.ephemeral?.value.executionsPerCycle.p95 ?? 0,
            p99: lastMonitoredHealth?.stats.ephemeral?.value.executionsPerCycle.p99 ?? 0,
          },
        },
        task_type_exclusion: excludeTaskTypes,
        failed_tasks: Object.entries(lastMonitoredHealth?.stats.workload?.value.task_types!).reduce(
          (numb, [key, val]) => {
            if (val.status.failed !== undefined) {
              numb += val.status.failed;
            }
            return numb;
          },
          0
        ),
      };
    },
    schema: {
      ephemeral_tasks_enabled: { type: 'boolean' },
      ephemeral_request_capacity: { type: 'short' },
      ephemeral_stats: {
        status: { type: 'keyword' },
        queued_tasks: {
          p50: { type: 'long' },
          p90: { type: 'long' },
          p95: { type: 'long' },
          p99: { type: 'long' },
        },
        load: {
          p50: { type: 'long' },
          p90: { type: 'long' },
          p95: { type: 'long' },
          p99: { type: 'long' },
        },
        executions_per_cycle: {
          p50: { type: 'long' },
          p90: { type: 'long' },
          p95: { type: 'long' },
          p99: { type: 'long' },
        },
      },
      task_type_exclusion: { type: 'array', items: { type: 'keyword' } },
      failed_tasks: { type: 'long' },
    },
  });
}

export function registerTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  ephemeralTasksEnabled: boolean,
  ephemeralRequestCapacity: number,
  excludeTaskTypes: string[]
) {
  const collector = createTaskManagerUsageCollector(
    usageCollection,
    monitoringStats$,
    ephemeralTasksEnabled,
    ephemeralRequestCapacity,
    excludeTaskTypes
  );
  usageCollection.registerCollector(collector);
}
