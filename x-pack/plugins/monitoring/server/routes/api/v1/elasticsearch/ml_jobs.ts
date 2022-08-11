/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postElasticsearchMlJobsRequestParamsRT,
  postElasticsearchMlJobsRequestPayloadRT,
  postElasticsearchMlJobsResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMlJobs } from '../../../../lib/elasticsearch/get_ml_jobs';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';
import { handleError } from '../../../../lib/errors/handle_error';
import { MonitoringCore } from '../../../../types';

export function mlJobRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchMlJobsRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchMlJobsRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ml_jobs',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;

      try {
        const clusterStats = await getClusterStats(req, clusterUuid);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(req, clusterStats);
        const rows = await getMlJobs(req);
        return postElasticsearchMlJobsResponsePayloadRT.encode({
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          rows,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
