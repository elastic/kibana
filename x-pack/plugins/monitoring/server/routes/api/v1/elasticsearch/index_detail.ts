/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { CCS_REMOTE_PATTERN } from '../../../../../common/constants';
import {
  postElasticsearchIndexDetailRequestParamsRT,
  postElasticsearchIndexDetailRequestPayloadRT,
  postElasticsearchIndexDetailResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { getIndexSummary } from '../../../../lib/elasticsearch/indices';
import { getShardAllocation, getShardStats } from '../../../../lib/elasticsearch/shards';
import { handleError } from '../../../../lib/errors/handle_error';
import { getLogs } from '../../../../lib/logs/get_logs';
import { MonitoringCore } from '../../../../types';
import { metricSets } from './metric_set_index_detail';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSets;

export function esIndexRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchIndexDetailRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchIndexDetailRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/indices/{id}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    handler: async (req) => {
      try {
        const config = server.config;
        const clusterUuid = req.params.clusterUuid;
        const indexUuid = req.params.id;
        const start = req.payload.timeRange.min;
        const end = req.payload.timeRange.max;

        const logsIndexPattern = getIndexPatterns({
          config,
          type: 'logs',
          moduleType: 'elasticsearch',
          ccs: CCS_REMOTE_PATTERN,
        });

        const isAdvanced = req.payload.is_advanced;
        const metricSet = isAdvanced ? metricSetAdvanced : metricSetOverview;

        const cluster = await getClusterStats(req, clusterUuid);
        const showSystemIndices = true; // hardcode to true, because this could be a system index

        const shardStats = await getShardStats(req, cluster, {
          includeNodes: true,
          includeIndices: true,
          indexName: indexUuid,
        });
        const indexSummary = await getIndexSummary(req, shardStats, {
          clusterUuid,
          indexUuid,
          start,
          end,
        });
        const metrics = await getMetrics(req, 'elasticsearch', metricSet, [
          { term: { 'index_stats.index': indexUuid } },
        ]);

        let logs;
        let shardAllocation;
        if (!isAdvanced) {
          // TODO: Why so many fields needed for a single component (shard legend)?
          const shardFilter = {
            bool: {
              should: [
                { term: { 'shard.index': indexUuid } },
                { term: { 'elasticsearch.index.name': indexUuid } },
              ],
            },
          };
          const stateUuid = get(
            cluster,
            'elasticsearch.cluster.stats.state.state_uuid',
            get(cluster, 'cluster_state.state_uuid')
          ) as string;
          const allocationOptions = {
            shardFilter,
            stateUuid,
            showSystemIndices,
          };
          const shards = await getShardAllocation(req, allocationOptions);

          logs = await getLogs(config, req, logsIndexPattern, {
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

        return postElasticsearchIndexDetailResponsePayloadRT.encode({
          indexSummary,
          metrics,
          logs,
          ...shardAllocation,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
