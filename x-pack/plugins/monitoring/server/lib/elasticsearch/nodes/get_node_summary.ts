/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { checkParam } from '../../error_missing_required';
// @ts-ignore
import { createQuery } from '../../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../../metrics';
// @ts-ignore
import { getDefaultNodeFromId, isDefaultNode } from './get_default_node_from_id';
// @ts-ignore
import { calculateNodeType } from './calculate_node_type';
// @ts-ignore
import { getNodeTypeClassLabel } from './get_node_type_class_label';
import {
  ElasticsearchSource,
  ElasticsearchResponse,
  ElasticsearchLegacySource,
} from '../../../../common/types/es';
import { LegacyRequest } from '../../../types';
import { getNewIndexPatterns } from '../../cluster/get_index_patterns';
import { Globals } from '../../../static_globals';

export function handleResponse(
  clusterState: ElasticsearchSource['cluster_state'],
  shardStats: any,
  nodeUuid: string
) {
  return (response: ElasticsearchResponse) => {
    let nodeSummary = {};
    const nodeStatsHits = response.hits?.hits ?? [];
    const nodes: Array<ElasticsearchLegacySource['source_node']> = nodeStatsHits.map(
      (hit) => hit._source.elasticsearch?.node || hit._source.source_node
    ); // using [0] value because query results are sorted desc per timestamp
    const node = nodes[0] || getDefaultNodeFromId(nodeUuid);
    const sourceStats =
      response.hits?.hits[0]?._source.elasticsearch?.node?.stats ||
      response.hits?.hits[0]?._source.node_stats;
    const clusterNode =
      clusterState && clusterState.nodes ? clusterState.nodes[nodeUuid] : undefined;
    const stats = {
      resolver: nodeUuid,
      node_ids: nodes.map((_node) => (isDefaultNode(node) ? node.id : node.id || node.uuid)),
      attributes: node.attributes,
      transport_address: response.hits?.hits[0]?._source.service?.address || node.transport_address,
      name: node.name,
      type: node.type,
    };

    if (clusterNode) {
      const _shardStats = shardStats.nodes[nodeUuid] ?? {};
      const calculatedNodeType = calculateNodeType(stats, clusterState?.master_node); // set type for labeling / iconography
      const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(
        node,
        calculatedNodeType
      );

      nodeSummary = {
        type: nodeType,
        nodeTypeLabel,
        nodeTypeClass,
        totalShards: _shardStats.shardCount,
        indexCount: _shardStats.indexCount,
        documents: sourceStats?.indices?.docs?.count,
        dataSize:
          sourceStats?.indices?.store?.size_in_bytes || sourceStats?.indices?.store?.size?.bytes,
        freeSpace:
          sourceStats?.fs?.total?.available_in_bytes || sourceStats?.fs?.summary?.available?.bytes,
        totalSpace:
          sourceStats?.fs?.total?.total_in_bytes || sourceStats?.fs?.summary?.total?.bytes,
        usedHeap:
          sourceStats?.jvm?.mem?.heap_used_percent || sourceStats?.jvm?.mem?.heap?.used?.pct,
        status: i18n.translate('xpack.monitoring.es.nodes.onlineStatusLabel', {
          defaultMessage: 'Online',
        }),
        isOnline: true,
      };
    } else {
      nodeSummary = {
        nodeTypeLabel: i18n.translate('xpack.monitoring.es.nodes.offlineNodeStatusLabel', {
          defaultMessage: 'Offline Node',
        }),
        status: i18n.translate('xpack.monitoring.es.nodes.offlineStatusLabel', {
          defaultMessage: 'Offline',
        }),
        isOnline: false,
      };
    }

    return {
      ...stats,
      ...nodeSummary,
    };
  };
}

export function getNodeSummary(
  req: LegacyRequest,
  clusterState: ElasticsearchSource['cluster_state'],
  shardStats: any,
  {
    clusterUuid,
    nodeUuid,
    start,
    end,
  }: { clusterUuid: string; nodeUuid: string; start: number; end: number }
) {
  const metric = ElasticsearchMetric.getMetricFields();
  const filters = [
    {
      term: { 'source_node.uuid': nodeUuid },
    },
  ];

  const dataset = 'node_stats';
  const moduleType = 'elasticsearch';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    dataset,
    moduleType,
  });

  const params = {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type: dataset,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        start,
        end,
        clusterUuid,
        metric,
        filters,
      }),
    },
  };
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(
    handleResponse(clusterState, shardStats, nodeUuid)
  );
}
