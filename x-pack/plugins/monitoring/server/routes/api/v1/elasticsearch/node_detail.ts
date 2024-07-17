/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import { CCS_REMOTE_PATTERN } from '../../../../../common/constants';
import {
  postElasticsearchNodeDetailRequestParamsRT,
  postElasticsearchNodeDetailRequestPayloadRT,
  postElasticsearchNodeDetailResponsePayloadRT,
} from '../../../../../common/http_api/elasticsearch';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import {
  getMetrics,
  MetricDescriptor,
  NamedMetricDescriptor,
} from '../../../../lib/details/get_metrics';
import { getNodeSummary } from '../../../../lib/elasticsearch/nodes';
import { getShardAllocation, getShardStats } from '../../../../lib/elasticsearch/shards';
import { handleError } from '../../../../lib/errors/handle_error';
import { getLogs } from '../../../../lib/logs/get_logs';
import { MonitoringCore } from '../../../../types';
import { metricSets } from './metric_set_node_detail';

const { advanced: metricSetAdvanced, overview: metricSetOverview } = metricSets;

export function esNodeRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postElasticsearchNodeDetailRequestParamsRT);
  const validateBody = createValidationFunction(postElasticsearchNodeDetailRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/nodes/{nodeUuid}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const config = server.config;
      const showSystemIndices = req.payload.showSystemIndices ?? false;
      const clusterUuid = req.params.clusterUuid;
      const nodeUuid = req.params.nodeUuid;
      const start = req.payload.timeRange.min;
      const end = req.payload.timeRange.max;

      const logsIndexPattern = getIndexPatterns({
        config,
        type: 'logs',
        moduleType: 'elasticsearch',
        ccs: CCS_REMOTE_PATTERN,
      });

      const isAdvanced = req.payload.is_advanced;

      let metricSet: MetricDescriptor[];
      if (isAdvanced) {
        metricSet = metricSetAdvanced;
      } else {
        metricSet = metricSetOverview;
        // set the cgroup option if needed
        const showCgroupMetricsElasticsearch = config.ui.container.elasticsearch.enabled;
        const metricCpu = metricSet.find(
          (m): m is NamedMetricDescriptor => typeof m === 'object' && m.name === 'node_cpu_metric'
        );
        if (metricCpu) {
          if (showCgroupMetricsElasticsearch) {
            metricCpu.keys = ['node_cgroup_quota_as_cpu_utilization'];
          } else {
            metricCpu.keys = ['node_cpu_utilization'];
          }
        }
      }

      try {
        const cluster = await getClusterStats(req, clusterUuid);

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

          logs = await getLogs(config, req, logsIndexPattern, {
            clusterUuid,
            nodeUuid,
            start,
            end,
          });
        }

        return postElasticsearchNodeDetailResponsePayloadRT.encode({
          nodeSummary,
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
