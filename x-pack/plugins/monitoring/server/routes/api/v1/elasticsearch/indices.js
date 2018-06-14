/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getIndices } from '../../../../lib/elasticsearch/indices';
import { getShardStats } from '../../../../lib/elasticsearch/shards';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';

export function esIndicesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/indices',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        query: Joi.object({
          show_system_indices: Joi.boolean()
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
      const { clusterUuid } = req.params;
      const { show_system_indices: showSystemIndices } = req.query;
      const { ccs } = req.payload;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      try {
        const clusterStats = await getClusterStats(req, esIndexPattern, clusterUuid);
        const shardStats = await getShardStats(req, esIndexPattern, clusterStats, { includeIndices: true });
        const indices = await getIndices(req, esIndexPattern, showSystemIndices, shardStats);

        reply({
          clusterStatus: getClusterStatus(clusterStats, shardStats),
          indices
        });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
