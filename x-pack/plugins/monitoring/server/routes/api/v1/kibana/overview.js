/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getKibanaClusterStatus } from './_get_kibana_cluster_status';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { metricSet } from './metric_set_overview';
import { handleError } from '../../../../lib/errors';

export function kibanaOverviewRoute(server) {
  /**
   * Kibana overview (metrics)
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        body: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const moduleType = 'kibana';
        const dsDatasets = ['stats', 'cluster_rules', 'cluster_actions'];
        const bools = dsDatasets.reduce((accum, dsDataset) => {
          accum.push(
            ...[
              { term: { 'data_stream.dataset': `${moduleType}.${dsDataset}` } },
              { term: { 'metricset.name': dsDataset } },
              { term: { type: `kibana_${dsDataset}` } },
            ]
          );
          return accum;
        }, []);
        const [clusterStatus, metrics] = await Promise.all([
          getKibanaClusterStatus(req, { clusterUuid }),
          getMetrics(req, moduleType, metricSet, [
            {
              bool: { should: bools },
            },
          ]),
        ]);

        return {
          clusterStatus,
          metrics,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
