/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import stats from 'stats-lite';
import { MonitoringCollectionSetup } from '../../../monitoring_collection/server';
import { CoreSetup } from '../../../../../src/core/server';
import { AlertingPluginsStart } from '../plugin';
import { RulesMetric } from './types';
import { getAllInMemoryMetrics, IN_MEMORY_METRICS } from '.';

export function registerCollector({
  monitoringCollection,
  core,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  core: CoreSetup<AlertingPluginsStart, unknown>;
}) {
  monitoringCollection.registerMetric({
    type: 'rules',
    fetch: async () => {
      const inMemoryMetrics = getAllInMemoryMetrics();

      const services = await core.getStartServices();
      const now = +new Date();
      const { docs: overdueTasks } = await services[1].taskManager.fetch({
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

      const metrics: RulesMetric = {
        overdue: {
          count: overdueTasks.length,
          duration: {
            p50: stats.percentile(overdueTasksDurations, 0.5),
            p99: stats.percentile(overdueTasksDurations, 0.99),
          },
        },
        failures: inMemoryMetrics[IN_MEMORY_METRICS.RULE_FAILURES],
        executions: inMemoryMetrics[IN_MEMORY_METRICS.RULE_EXECUTIONS],
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
