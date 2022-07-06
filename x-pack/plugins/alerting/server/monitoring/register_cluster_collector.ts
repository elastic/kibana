/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AggregationsKeyedPercentiles,
  AggregationsPercentilesAggregateBase,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import {
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
} from '@kbn/task-manager-plugin/server';
import { CoreSetup } from '@kbn/core/server';
import { AlertingPluginsStart } from '../plugin';
import { ClusterRulesMetric, EMPTY_CLUSTER_RULES_METRICS } from './types';

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
      try {
        const [_, pluginStart] = await core.getStartServices();
        const results = await pluginStart.taskManager.aggregate({
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
          runtime_mappings: {
            overdueBy: {
              type: 'long',
              script: {
                source: `
                  def runAt = doc['task.runAt'];
                  if(!runAt.empty) {
                    emit(new Date().getTime() - runAt.value.getMillis());
                  } else {
                    def retryAt = doc['task.retryAt'];
                    if(!retryAt.empty) {
                      emit(new Date().getTime() - retryAt.value.getMillis());
                    } else {
                      emit(0);
                    }
                  }
                `,
              },
            },
          },
          aggs: {
            overdueByPercentiles: {
              percentiles: {
                field: 'overdueBy',
                percents: [50, 99],
              },
            },
          },
        });

        const totalOverdueTasks =
          typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;
        const aggregations = results.aggregations as {
          overdueByPercentiles: AggregationsPercentilesAggregateBase;
        };
        const overdueByValues: AggregationsKeyedPercentiles =
          (aggregations?.overdueByPercentiles?.values as AggregationsKeyedPercentiles) ?? {};

        /**
         * Response format
         * {
         *   "aggregations": {
         *     "overdueBy": {
         *       "values": {
         *         "50.0": 3027400
         *         "99.0": 3035402
         *       }
         *     }
         *   }
         * }
         */

        const metrics: ClusterRulesMetric = {
          overdue: {
            count: totalOverdueTasks ?? 0,
            delay: {
              p50: (overdueByValues['50.0'] as number) ?? 0,
              p99: (overdueByValues['99.0'] as number) ?? 0,
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
      } catch (err) {
        return EMPTY_CLUSTER_RULES_METRICS;
      }
    },
  });
}
