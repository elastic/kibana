/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUndefined } from 'lodash';
// @ts-ignore
import { calculateNodeType } from '../calculate_node_type';
// @ts-ignore
import { getNodeTypeClassLabel } from '../get_node_type_class_label';
import {
  ElasticsearchResponseHit,
  ElasticsearchModifiedSource,
} from '../../../../../common/types/es';

/**
 * @param {Array} nodeHits: info about each node from the hits in the get_nodes query
 * @param {Object} clusterStats: cluster stats from cluster state document
 * @param {Object} nodesShardCount: per-node information about shards
 * @return {Object} summarized info about each node keyed by nodeId
 */
export function mapNodesInfo(
  nodeHits: ElasticsearchResponseHit[],
  clusterStats?: ElasticsearchModifiedSource,
  nodesShardCount?: { nodes: { [nodeId: string]: { shardCount: number } } }
) {
  const clusterState =
    clusterStats?.cluster_state ?? clusterStats?.elasticsearch?.cluster?.stats?.state;

  return nodeHits.reduce((prev, node) => {
    const sourceNode = node._source.source_node || node._source.elasticsearch?.node;

    const calculatedNodeType = calculateNodeType(sourceNode, clusterState?.master_node);
    const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(
      sourceNode,
      calculatedNodeType
    );
    const uuid = sourceNode?.uuid ?? sourceNode?.id ?? undefined;
    if (!uuid) {
      return prev;
    }
    const isOnline = !isUndefined(clusterState?.nodes ? clusterState.nodes[uuid] : undefined);

    return {
      ...prev,
      [uuid]: {
        name: sourceNode?.name,
        transport_address: node._source.service?.address ?? sourceNode?.transport_address,
        type: nodeType,
        isOnline,
        nodeTypeLabel,
        nodeTypeClass,
        shardCount: nodesShardCount?.nodes[uuid]?.shardCount ?? 0,
      },
    };
  }, {});
}
