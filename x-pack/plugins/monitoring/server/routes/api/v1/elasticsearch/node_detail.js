/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { schema } from '@kbn/config-schema';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getNodeSummary } from '../../../../lib/elasticsearch/nodes';
import { getShardStats, getShardAllocation } from '../../../../lib/elasticsearch/shards';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPatternWithCcs } from '../../../../../common/ccs_utils';
import { metricSets } from './metric_set_node_detail';
import { getLogs } from '../../../../lib/logs/get_logs';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSets;

export function esNodeRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/nodes/{nodeUuid}',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          nodeUuid: schema.string(),
        }),
        payload: schema.object({
          ccs: schema.maybe(schema.string()),
          showSystemIndices: schema.boolean({ defaultValue: false }), // show/hide system indices in shard allocation table
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
          is_advanced: schema.boolean(),
        }),
      },
    },
    async handler(req) {
      const config = server.config;
      const ccs = req.payload.ccs;
      const showSystemIndices = req.payload.showSystemIndices;
      const clusterUuid = req.params.clusterUuid;
      const nodeUuid = req.params.nodeUuid;
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;
      const filebeatIndexPattern = prefixIndexPatternWithCcs(
        config,
        config.ui.logs.index,
        config.ui.ccs.remotePatterns
      );
      const isAdvanced = req.payload.is_advanced;

      let metricSet;
      if (isAdvanced) {
        metricSet = metricSetAdvanced;
      } else {
        metricSet = metricSetOverview;
        // set the cgroup option if needed
        const showCgroupMetricsElasticsearch = config.ui.container.elasticsearch.enabled;
        const metricCpu = metricSet.find((m) => m.name === 'node_cpu_metric');
        if (showCgroupMetricsElasticsearch) {
          metricCpu.keys = ['node_cgroup_quota_as_cpu_utilization'];
        } else {
          metricCpu.keys = ['node_cpu_utilization'];
        }
      }

      try {
        const cluster = await getClusterStats(req, clusterUuid, ccs);

        const clusterState = get(
          cluster,
          'cluster_state',
          get(cluster, 'elasticsearch.cluster.stats.state')
        );

        const shardStats = await getShardStats(req, cluster, {
          includeIndices: true,
          includeNodes: true,
          nodeUuid,
        });
        const nodeSummary = await getNodeSummary(req, clusterState, shardStats, {
          clusterUuid,
          nodeUuid,
          start,
          end,
        });
        const metrics = await getMetrics(req, 'elasticsearch', metricSet, [
          { term: { 'source_node.uuid': nodeUuid } },
        ]);
        let logs;
        let shardAllocation;
        if (!isAdvanced) {
          // TODO: Why so many fields needed for a single component (shard legend)?
          const shardFilter = {
            bool: {
              should: [
                { term: { 'shard.node': nodeUuid } },
                { term: { 'elasticsearch.node.name': nodeUuid } },
              ],
            },
          };
          const stateUuid = get(
            cluster,
            'cluster_state.state_uuid',
            get(cluster, 'elasticsearch.cluster.stats.state.state_uuid')
          );
          const allocationOptions = {
            shardFilter,
            stateUuid,
            showSystemIndices,
          };
          const shards = await getShardAllocation(req, allocationOptions);

          shardAllocation = {
            shards,
            shardStats: { indices: shardStats.indices },
            nodes: shardStats.nodes, // for identifying nodes that shard relocates to
            stateUuid, // for debugging/troubleshooting
          };

          logs = await getLogs(config, req, filebeatIndexPattern, {
            clusterUuid,
            nodeUuid,
            start,
            end,
          });
        }

        return {
          nodeSummary,
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
