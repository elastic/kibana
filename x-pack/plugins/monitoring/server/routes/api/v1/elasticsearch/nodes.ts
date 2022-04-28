/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postElasticsearchNodesRequestParamsRT,
  postElasticsearchNodesRequestPayloadRT,
  postElasticsearchNodesResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getNodes } from '../../../../lib/elasticsearch/nodes';
import { getPaginatedNodes } from '../../../../lib/elasticsearch/nodes/get_nodes/get_paginated_nodes';
import { LISTING_METRICS_NAMES } from '../../../../lib/elasticsearch/nodes/get_nodes/nodes_listing_metrics';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';
import { getNodesShardCount } from '../../../../lib/elasticsearch/shards/get_nodes_shard_count';
import { handleError } from '../../../../lib/errors/handle_error';
import { MonitoringCore } from '../../../../types';

export function esNodesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchNodesRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchNodesRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/nodes',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const {
        pagination,
        sort: { field = '', direction = 'asc' } = {},
        queryText = '',
      } = req.payload;
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
          {
            field,
            direction,
          },
          queryText,
          {
            clusterStats,
            nodesShardCount,
          }
        );

        const nodes = await getNodes(req, pageOfNodes, clusterStats, nodesShardCount);
        return postElasticsearchNodesResponsePayloadRT.encode({
          clusterStatus,
          nodes,
          totalNodeCount,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
