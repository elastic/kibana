/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { MonitoringStats } from '../monitoring';
import { TaskManagerUsage } from './types';

export function createTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoringStats>,
  ephemeralTasksEnabled: boolean
) {
  let lastMonitoredStats: MonitoringStats | null = null;
  monitoringStats$.subscribe((stats) => {
    lastMonitoredStats = stats;
  });

  return usageCollection.makeUsageCollector<TaskManagerUsage>({
    type: 'task_manager',
    isReady: async () => {
      return Boolean(lastMonitoredStats);
    },
    fetch: async () => {
      return {
        ephemeral_tasks_enabled: ephemeralTasksEnabled,
      };
    },
    schema: {
      ephemeral_tasks_enabled: { type: 'boolean' },
    },
  });
}

export function registerTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoringStats>,
  ephemeralTasksEnabled: boolean
) {
  const collector = createTaskManagerUsageCollector(
    usageCollection,
    monitoringStats$,
    ephemeralTasksEnabled
  );
  usageCollection.registerCollector(collector);
}
