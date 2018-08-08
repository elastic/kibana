/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getLastRecovery } from '../../../../lib/elasticsearch/get_last_recovery';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getShardStats } from '../../../../lib/elasticsearch/shards';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSet } from './metric_set_overview';

export function esOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required()
          }).required()
        })
      }
    },
    async handler(req, reply) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      try {
        const [ clusterStats, metrics, shardActivity ] = await Promise.all([
          getClusterStats(req, esIndexPattern, clusterUuid),
          getMetrics(req, esIndexPattern, metricSet),
          getLastRecovery(req, esIndexPattern),
        ]);
        const shardStats = await getShardStats(req, esIndexPattern, clusterStats);

        reply({
          clusterStatus: getClusterStatus(clusterStats, shardStats),
          metrics,
          shardActivity
        });
      } catch (err) {
        reply(handleError(err, req));
      }
    }
  });
}
