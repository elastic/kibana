/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CCS_REMOTE_PATTERN } from '../../../../../common/constants';
import {
  postElasticsearchOverviewRequestParamsRT,
  postElasticsearchOverviewRequestPayloadRT,
  postElasticsearchOverviewResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getLastRecovery } from '../../../../lib/elasticsearch/get_last_recovery';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';
import { handleError } from '../../../../lib/errors/handle_error';
import { getLogs } from '../../../../lib/logs';
import { MonitoringCore } from '../../../../types';
import { metricSet } from './metric_set_overview';

export function esOverviewRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchOverviewRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchOverviewRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;

      const logsIndexPattern = getIndexPatterns({
        config,
        type: 'logs',
        moduleType: 'elasticsearch',
        ccs: CCS_REMOTE_PATTERN,
      });

      const { min: start, max: end } = req.payload.timeRange;

      try {
        const [clusterStats, metrics, shardActivity, logs] = await Promise.all([
          getClusterStats(req, clusterUuid),
          getMetrics(req, 'elasticsearch', metricSet),
          getLastRecovery(req, config.ui.max_bucket_size),
          // TODO this call is missing some items from the signature of `getLogs`, will need to resolve during TS conversion
          getLogs(config, req, logsIndexPattern, { clusterUuid, start, end }),
        ]);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(req, clusterStats);

        const result = {
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          metrics,
          logs,
          shardActivity,
        };
        return postElasticsearchOverviewResponsePayloadRT.encode(result);
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
