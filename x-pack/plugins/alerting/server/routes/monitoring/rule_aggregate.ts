/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ILicenseState } from '../../lib';
import { verifyAccessAndContext } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../types';

const paramSchema = schema.object({
  id: schema.string(),
});

export const monitoringRuleAggregateRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  monitoringCollection?: MonitoringCollectionSetup
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/monitoring/aggregate`,
      validate: {
        params: paramSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { id } = req.params;
        try {
          const query: estypes.QueryDslQueryContainer = {
            bool: {
              must: [
                {
                  term: {
                    'data_stream.dataset': {
                      value: 'apm.app.kibana',
                    },
                  },
                },
                {
                  term: {
                    'labels.rule_id': {
                      value: id,
                    },
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-15m',
                    },
                  },
                },
              ],
            },
          };
          const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
            time_buckets: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '30s',
              },
              aggs: {
                executions_raw: {
                  max: {
                    field: 'kibana_alerting_node_rule_executions',
                  },
                },
                executions: {
                  derivative: {
                    buckets_path: 'executions_raw',
                    // @ts-ignore
                    unit: '1s',
                  },
                },

                execution_time_raw: {
                  max: {
                    field: 'kibana_alerting_node_rule_execution_time',
                  },
                },
                execution_time: {
                  derivative: {
                    buckets_path: 'execution_time_raw',
                    // @ts-ignore
                    unit: '1s',
                  },
                },
              },
            },
          };
          const results = await monitoringCollection?.aggregateMonitoringData(query, aggs);
          const buckets = (
            results?.time_buckets as {
              buckets: Array<{
                executions: { value?: number };
                execution_time: { value?: number };
                key: string;
              }>;
            }
          )?.buckets;

          return res.ok({
            body: buckets?.reduce<
              Record<string, { data: Array<{ timestamp: string; value: number }> }>
            >(
              (accum, bucket) => {
                const timestamp = bucket.key;
                accum.execution.data.push({ timestamp, value: bucket.executions?.value ?? 0 });
                accum.execution_time.data.push({
                  timestamp,
                  value: bucket.execution_time?.value ?? 0,
                });
                return accum;
              },
              {
                execution: { data: [] },
                execution_time: { data: [] },
              }
            ),
          });
        } catch (error) {
          return res.badRequest({ body: error });
        }
      })
    )
  );
};
