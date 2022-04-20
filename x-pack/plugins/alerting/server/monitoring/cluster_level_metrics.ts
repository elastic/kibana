/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import stats from 'stats-lite';
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from '@kbn/task-manager-plugin/server';
import { CoreSetup } from '@kbn/core/server';
import { AlertingPluginsStart } from '../plugin';

export function registerClusterCollector({
  monitoringCollection,
  core,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  core: CoreSetup<AlertingPluginsStart, unknown>;
}) {
  monitoringCollection.registerMetricSet({
    id: `kibana_alerting_cluster_rules`,
    keys: ['overdue_count', 'overdue_delay_p50', 'overdue_delay_p99'],
    fetch: async () => {
      const [_, pluginStart] = await core.getStartServices();
      const now = +new Date();
      const { docs: overdueTasks } = await pluginStart.taskManager.fetch({
        query: {
          bool: {
            must: [
              {
                term: {
                  'task.scope': {
                    value: 'alerting',
                  },
                },
              },
              {
                bool: {
                  should: [IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt],
                },
              },
            ],
          },
        },
      });

      const overdueTasksDelay = overdueTasks.map(
        (overdueTask) => now - +new Date(overdueTask.runAt || overdueTask.retryAt)
      );
      const p50 = stats.percentile(overdueTasksDelay, 0.5);
      const p99 = stats.percentile(overdueTasksDelay, 0.99);
      return {
        overdue_count: overdueTasks.length,
        overdue_delay_p50: isNaN(p50) ? 0 : p50,
        overdue_delay_p99: isNaN(p99) ? 0 : p99,
      };
    },
  });
}
