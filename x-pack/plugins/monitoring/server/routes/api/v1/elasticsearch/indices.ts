/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postElasticsearchIndicesRequestParamsRT,
  postElasticsearchIndicesRequestPayloadRT,
  postElasticsearchIndicesRequestQueryRT,
  postElasticsearchIndicesResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getIndices } from '../../../../lib/elasticsearch/indices';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';
import { handleError } from '../../../../lib/errors/handle_error';
import { MonitoringCore } from '../../../../types';

export function esIndicesRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchIndicesRequestParamsRT);
  const validateQuery = createValidationFunction(postElasticsearchIndicesRequestQueryRT);
  const validateBody = createValidationFunction(postElasticsearchIndicesRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/indices',
    validate: {
      params: validateParams,
      query: validateQuery,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const { clusterUuid } = req.params;
      const { show_system_indices: showSystemIndices } = req.query;

      try {
        const clusterStats = await getClusterStats(req, clusterUuid);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(req, clusterStats);
        const indices = await getIndices(req, showSystemIndices, indicesUnassignedShardStats);

        return postElasticsearchIndicesResponsePayloadRT.encode({
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          indices,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
