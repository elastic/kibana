/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ILicenseState } from '../../lib';
import { verifyAccessAndContext } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../types';
import { MonitoringCollectionSetup } from '../../../../monitoring_collection/server';

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
              ],
            },
          };
          const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
            history: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '30m',
              },
              aggs: {
                executions: {
                  max: {
                    field: 'kibana_alerting_node_rule_executions',
                  },
                },
              },
            },
          };
          const results = await monitoringCollection?.aggregateMonitoringData(query, aggs);
          return res.ok({
            body: results, // rewriteBodyRes(results),
          });
        } catch (error) {
          return res.badRequest({ body: error });
        }
      })
    )
  );
};
