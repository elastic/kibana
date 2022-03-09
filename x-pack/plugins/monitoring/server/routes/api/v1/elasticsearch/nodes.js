/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getNodes } from '../../../../lib/elasticsearch/nodes';
import { getNodesShardCount } from '../../../../lib/elasticsearch/shards/get_nodes_shard_count';
import { handleError } from '../../../../lib/errors/handle_error';
import { getPaginatedNodes } from '../../../../lib/elasticsearch/nodes/get_nodes/get_paginated_nodes';
import { LISTING_METRICS_NAMES } from '../../../../lib/elasticsearch/nodes/get_nodes/nodes_listing_metrics';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';

export function esNodesRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/nodes',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
          pagination: schema.object({
            index: schema.number(),
            size: schema.number(),
          }),
          sort: schema.object({
            field: schema.string({ defaultValue: '' }),
            direction: schema.string({ defaultValue: '' }),
          }),
          queryText: schema.string({ defaultValue: '' }),
        }),
      },
    },
    async handler(req) {
      const { ccs, pagination, sort, queryText } = req.payload;
      const clusterUuid = req.params.clusterUuid;

      try {
        const clusterStats = await getClusterStats(req, clusterUuid);
        const nodesShardCount = await getNodesShardCount(req, clusterStats);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(req, clusterStats);
        const clusterStatus = getClusterStatus(clusterStats, indicesUnassignedShardStats);

        const metricSet = LISTING_METRICS_NAMES;
        const { pageOfNodes, totalNodeCount } = await getPaginatedNodes(
          req,
          { clusterUuid },
          metricSet,
          pagination,
          sort,
          queryText,
          {
            clusterStats,
            nodesShardCount,
          },
          ccs
        );

        const nodes = await getNodes(req, pageOfNodes, clusterStats, nodesShardCount);
        return { clusterStatus, nodes, totalNodeCount };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
