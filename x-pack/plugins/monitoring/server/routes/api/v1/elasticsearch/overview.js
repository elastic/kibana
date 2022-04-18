/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getLastRecovery } from '../../../../lib/elasticsearch/get_last_recovery';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { metricSet } from './metric_set_overview';
import { getLogs } from '../../../../lib/logs';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';
import { CCS_REMOTE_PATTERN } from '../../../../../common/constants';

export function esOverviewRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch',
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
        }),
      },
    },
    async handler(req) {
      const config = server.config;
      const clusterUuid = req.params.clusterUuid;
      const filebeatIndexPattern = prefixIndexPattern(
        config,
        config.ui.logs.index,
        CCS_REMOTE_PATTERN
      );

      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;

      try {
        const [clusterStats, metrics, shardActivity, logs] = await Promise.all([
          getClusterStats(req, clusterUuid),
          getMetrics(req, 'elasticsearch', metricSet),
          getLastRecovery(req, config.ui.max_bucket_size),
          // TODO this call is missing some items from the signature of `getLogs`, will need to resolve during TS conversion
          getLogs(config, req, filebeatIndexPattern, { clusterUuid, start, end }),
        ]);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(req, clusterStats);

        const result = {
          clusterStatus: getClusterStatus(clusterStats, indicesUnassignedShardStats),
          metrics,
          logs,
          shardActivity,
        };
        return result;
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
