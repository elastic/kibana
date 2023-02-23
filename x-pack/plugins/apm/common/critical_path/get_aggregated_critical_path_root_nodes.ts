/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy } from 'lodash';
import type { CriticalPathResponse } from '../../server/routes/traces/get_aggregated_critical_path';

export interface CriticalPathTreeNode {
  nodeId: string;
  children: CriticalPathTreeNode[];
  countInclusive: number;
  countExclusive: number;
}

export function getAggregatedCriticalPathRootNodes(params: {
  criticalPath: CriticalPathResponse;
}): {
  rootNodes: CriticalPathTreeNode[];
  maxDepth: number;
  numNodes: number;
} {
  let maxDepth = 20; // min max depth

  const { criticalPath } = params;

  let numNodes = 0;

  function mergeNodesWithSameOperationId(
    nodes: CriticalPathTreeNode[]
  ): CriticalPathTreeNode[] {
    const nodesByOperationId: Record<string, CriticalPathTreeNode> = {};
    const mergedNodes = nodes.reduce<CriticalPathTreeNode[]>(
      (prev, node, index, array) => {
        const nodeId = node.nodeId;
        const operationId = criticalPath.operationIdByNodeId[nodeId];
        if (nodesByOperationId[operationId]) {
          const prevNode = nodesByOperationId[operationId];
          prevNode.children.push(...node.children);
          prevNode.countExclusive += node.countExclusive;
          prevNode.countInclusive += node.countInclusive;
          return prev;
        }

        nodesByOperationId[operationId] = node;

        prev.push(node);
        return prev;
      },
      []
    );

    numNodes += mergedNodes.length;

    mergedNodes.forEach((node) => {
      node.children = mergeNodesWithSameOperationId(node.children);
    });

    return mergedNodes;
  }

  function getNode(nodeId: string, depth: number): CriticalPathTreeNode {
    maxDepth = Math.max(maxDepth, depth);

    const children = criticalPath.nodes[nodeId].map((childNodeId) =>
      getNode(childNodeId, depth + 1)
    );

    const nodeCountExclusive = criticalPath.timeByNodeId[nodeId] || 0;
    const nodeCountInclusive =
      sumBy(children, (child) => child.countInclusive) + nodeCountExclusive;

    return {
      nodeId,
      children,
      countInclusive: nodeCountInclusive,
      countExclusive: nodeCountExclusive,
    };
  }

  const rootNodes = mergeNodesWithSameOperationId(
    criticalPath.rootNodes.map((nodeId) => getNode(nodeId, 1))
  );

  return {
    rootNodes,
    maxDepth,
    numNodes,
  };
}
