/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getIndices } from '../../../../lib/elasticsearch/indices';
import { handleError } from '../../../../lib/errors/handle_error';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';

export function esIndicesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/indices',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        query: schema.object({
          show_system_indices: schema.boolean(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req) {
      const { clusterUuid } = req.params;
      const { show_system_indices: showSystemIndices } = req.query;
      const { ccs } = req.payload;

      try {
        const clusterStats = await getClusterStats(req, clusterUuid, ccs);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(req, clusterStats);
        const indices = await getIndices(req, showSystemIndices, indicesUnassignedShardStats);

        return {
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          indices,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
