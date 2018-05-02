/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import Joi from 'joi';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getIndices } from '../../../../lib/elasticsearch/indices';
import { getShardStats, getUnassignedShards } from '../../../../lib/elasticsearch/shards';
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
        payload: Joi.object({
          ccs: Joi.string().optional(),
          showSystemIndices: Joi.boolean().default(false), // show/hide indices in listing
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
      const showSystemIndices = req.payload.showSystemIndices;
      const esIndexPattern = prefixIndexPattern(config, 'xpack.monitoring.elasticsearch.index_pattern', ccs);

      try {
        const clusterStats = await getClusterStats(req, esIndexPattern, clusterUuid);
        const shardStats = await getShardStats(req, esIndexPattern, clusterStats, { includeIndices: true });
        const rows = await getIndices(req, esIndexPattern, showSystemIndices);

        const mappedRows = rows.map(row => {
          const { name } = row;
          const shardStatsForIndex = get(shardStats, ['indices', name]);

          if (shardStatsForIndex && shardStatsForIndex.status) {
            return {
              ...row,
              status: shardStatsForIndex.status,
              unassigned_shards: getUnassignedShards(shardStatsForIndex),
            };
          }

          // not in shardStats docs, is a deleted index
          return {
            name,
            status: 'Deleted'
          };
        });

        reply({
          clusterStatus: getClusterStatus(clusterStats, shardStats),
          rows: mappedRows
        });
      } catch(err) {
        reply(handleError(err, req));
      }
    }
  });
}
