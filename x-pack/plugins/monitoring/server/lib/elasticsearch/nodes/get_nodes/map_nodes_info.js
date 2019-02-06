/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isUndefined } from 'lodash';
import {
  calculateNodeType,
  getNodeTypeClassLabel,
} from '../';

/**
 * @param {Array} nodeHits: info about each node from the hits in the get_nodes query
 * @param {Object} clusterStats: cluster stats from cluster state document
 * @param {Object} shardStats: per-node information about shards
 * @return {Object} summarized info about each node keyed by nodeId
 */
export function mapNodesInfo(nodeHits, clusterStats, shardStats) {
  const clusterState = get(clusterStats, 'cluster_state', { nodes: {} });

  return nodeHits.reduce((prev, node) => {
    const sourceNode = get(node, '_source.node_stats');

    const calculatedNodeType = calculateNodeType(sourceNode, get(clusterState, 'master_node'));
    const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(sourceNode, calculatedNodeType);
    const isOnline = !isUndefined(get(clusterState, [ 'nodes', sourceNode.node_id ]));

    return {
      ...prev,
      [sourceNode.node_id]: {
        name: sourceNode.node_id,
        transport_address: sourceNode.transport_address,
        type: nodeType,
        isOnline,
        nodeTypeLabel: nodeTypeLabel,
        nodeTypeClass: nodeTypeClass,
        shardCount: get(shardStats, `nodes[${sourceNode.node_id}].shardCount`, 0),
      }
    };
  }, {});
}
