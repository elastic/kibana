/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { getClusterStats } from '../../../../lib/cluster/get_cluster_stats';
import { getClusterStatus } from '../../../../lib/cluster/get_cluster_status';
import { getNodes } from '../../../../lib/elasticsearch/nodes';
import { getNodesShardCount } from '../../../../lib/elasticsearch/shards/get_nodes_shard_count';
import { handleError } from '../../../../lib/errors/handle_error';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import {
  ALERT_CPU_USAGE,
  ALERT_DISK_USAGE,
  ALERT_MEMORY_USAGE,
  ALERT_MISSING_MONITORING_DATA,
  ELASTICSEARCH_SYSTEM_ID,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../../../../common/constants';
import { getPaginatedNodes } from '../../../../lib/elasticsearch/nodes/get_nodes/get_paginated_nodes';
import { LISTING_METRICS_NAMES } from '../../../../lib/elasticsearch/nodes/get_nodes/nodes_listing_metrics';
import { getIndicesUnassignedShardStats } from '../../../../lib/elasticsearch/shards/get_indices_unassigned_shard_stats';
import { fetchStatus } from '../../../../lib/alerts/fetch_status';

export function esNodesRoute(server, npRoute) {
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
      const config = server.config();
      const { ccs, pagination, sort, queryText } = req.payload;
      const min = moment.utc(req.payload.timeRange.min).valueOf();
      const max = moment.utc(req.payload.timeRange.max).valueOf();
      const clusterUuid = req.params.clusterUuid;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);

      try {
        const clusterStats = await getClusterStats(req, esIndexPattern, clusterUuid);
        const nodesShardCount = await getNodesShardCount(req, esIndexPattern, clusterStats);
        const indicesUnassignedShardStats = await getIndicesUnassignedShardStats(
          req,
          esIndexPattern,
          clusterStats
        );
        const clusterStatus = getClusterStatus(clusterStats, indicesUnassignedShardStats);

        const alertsClient = req.getAlertsClient();
        const status = alertsClient
          ? await fetchStatus(
              alertsClient,
              npRoute.licenseService,
              [
                ALERT_CPU_USAGE,
                ALERT_DISK_USAGE,
                ALERT_MEMORY_USAGE,
                ALERT_MISSING_MONITORING_DATA,
              ],
              clusterUuid,
              min,
              max,
              [
                {
                  stackProduct: ELASTICSEARCH_SYSTEM_ID,
                },
              ]
            )
          : {};
        const metricSet = LISTING_METRICS_NAMES;
        const { pageOfNodes, totalNodeCount } = await getPaginatedNodes(
          req,
          esIndexPattern,
          { clusterUuid },
          metricSet,
          pagination,
          sort,
          queryText,
          {
            clusterStats,
            nodesShardCount,
          },
          status
        );

        const nodes = await getNodes(
          req,
          esIndexPattern,
          pageOfNodes,
          clusterStats,
          nodesShardCount
        );
        return { clusterStatus, nodes, totalNodeCount, alerts: status };
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
