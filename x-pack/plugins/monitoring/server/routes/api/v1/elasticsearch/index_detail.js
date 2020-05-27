/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { schema } from '@kbn/config-schema';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getIndexSummary } from '../../../../lib/elasticsearch/indices';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getShardAllocation, getShardStats } from '../../../../lib/elasticsearch/shards';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { metricSet } from './metric_set_index_detail';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';
import { getLogs } from '../../../../lib/logs/get_logs';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSet;

export function esIndexRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/indices/{id}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          id: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
          is_advanced: schema.boolean(),
        }),
      },
    },
    handler: async (req) => {
      try {
        const config = server.config();
        const ccs = req.payload.ccs;
        const clusterUuid = req.params.clusterUuid;
        const indexUuid = req.params.id;
        const start = req.payload.timeRange.min;
        const end = req.payload.timeRange.max;
        const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
        const filebeatIndexPattern = prefixIndexPattern(
          config,
          config.get('monitoring.ui.logs.index'),
          '*'
        );
        const isAdvanced = req.payload.is_advanced;
        const metricSet = isAdvanced ? metricSetAdvanced : metricSetOverview;

        const cluster = await getClusterStats(req, esIndexPattern, clusterUuid);
        const showSystemIndices = true; // hardcode to true, because this could be a system index

        const shardStats = await getShardStats(req, esIndexPattern, cluster, {
          includeNodes: true,
          includeIndices: true,
          indexName: indexUuid,
        });
        const indexSummary = await getIndexSummary(req, esIndexPattern, shardStats, {
          clusterUuid,
          indexUuid,
          start,
          end,
        });
        const metrics = await getMetrics(req, esIndexPattern, metricSet, [
          { term: { 'index_stats.index': indexUuid } },
        ]);

        let logs;
        let shardAllocation;
        if (!isAdvanced) {
          // TODO: Why so many fields needed for a single component (shard legend)?
          const shardFilter = { term: { 'shard.index': indexUuid } };
          const stateUuid = get(cluster, 'cluster_state.state_uuid');
          const allocationOptions = {
            shardFilter,
            stateUuid,
            showSystemIndices,
          };
          const shards = await getShardAllocation(req, esIndexPattern, allocationOptions);

          logs = await getLogs(config, req, filebeatIndexPattern, {
            clusterUuid,
            indexUuid,
            start,
            end,
          });

          shardAllocation = {
            shards,
            shardStats: { nodes: shardStats.nodes },
            nodes: shardStats.nodes, // for identifying nodes that shard relocates to
            stateUuid, // for debugging/troubleshooting
          };
        }

        return {
          indexSummary,
          metrics,
          logs,
          ...shardAllocation,
        };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
