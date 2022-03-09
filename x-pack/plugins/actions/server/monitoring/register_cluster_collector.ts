/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import stats from 'stats-lite';
import { MonitoringCollectionSetup } from '../../../monitoring_collection/server';
import { CoreSetup } from '../../../../../src/core/server';
import { ActionsPluginsStart } from '../plugin';
import { ClusterActionsMetric } from './types';

export function registerClusterCollector({
  monitoringCollection,
  core,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  core: CoreSetup<ActionsPluginsStart, unknown>;
}) {
  monitoringCollection.registerMetric({
    type: 'cluster_actions',
    schema: {
      overdue: {
        count: {
          type: 'long',
        },
        duration: {
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
      const services = await core.getStartServices();
      const now = +new Date();
      const { docs: overdueTasks } = await services[1].taskManager.fetch({
        query: {
          bool: {
            must: [
              {
                term: {
                  'task.scope': {
                    value: 'actions',
                  },
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          {
                            range: {
                              'task.runAt': {
                                format: 'epoch_millis',
                                lt: now,
                              },
                            },
                          },
                          {
                            term: {
                              'task.status': {
                                value: 'idle',
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          {
                            range: {
                              'task.retryAt': {
                                format: 'epoch_millis',
                                lt: now,
                              },
                            },
                          },
                          {
                            bool: {
                              should: [
                                {
                                  term: {
                                    'task.status': {
                                      value: 'running',
                                    },
                                  },
                                },
                                {
                                  term: {
                                    'task.status': {
                                      value: 'claimed',
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const overdueTasksDurations = overdueTasks.map(
        (overdueTask) => now - +new Date(overdueTask.runAt || overdueTask.retryAt)
      );

      const metrics: ClusterActionsMetric = {
        overdue: {
          count: overdueTasks.length,
          duration: {
            p50: stats.percentile(overdueTasksDurations, 0.5),
            p99: stats.percentile(overdueTasksDurations, 0.99),
          },
        },
      };

      if (isNaN(metrics.overdue.duration.p50)) {
        metrics.overdue.duration.p50 = 0;
      }

      if (isNaN(metrics.overdue.duration.p99)) {
        metrics.overdue.duration.p99 = 0;
      }

      return metrics;
    },
  });
}
