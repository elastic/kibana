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
import { ClusterRulesMetric } from './types';

export function registerClusterCollector({
  monitoringCollection,
  core,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  core: CoreSetup<AlertingPluginsStart, unknown>;
}) {
  monitoringCollection.registerMetric({
    type: 'cluster_rules',
    schema: {
      overdue: {
        count: {
          type: 'long',
        },
        delay: {
          p50: {
            type: 'long',
          },
          p99: {
            type: 'long',
          },
        },
      },
    },
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

      const metrics: ClusterRulesMetric = {
        overdue: {
          count: overdueTasks.length,
          delay: {
            p50: stats.percentile(overdueTasksDelay, 0.5),
            p99: stats.percentile(overdueTasksDelay, 0.99),
          },
        },
      };

      if (isNaN(metrics.overdue.delay.p50)) {
        metrics.overdue.delay.p50 = 0;
      }

      if (isNaN(metrics.overdue.delay.p99)) {
        metrics.overdue.delay.p99 = 0;
      }

      return metrics;
    },
  });
}
