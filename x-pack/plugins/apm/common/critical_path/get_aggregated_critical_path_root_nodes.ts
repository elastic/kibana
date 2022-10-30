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
} {
  let maxDepth = 20; // min max depth

  const { criticalPath } = params;

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

  const rootNodes = criticalPath.rootNodes.map((nodeId) => getNode(nodeId, 1));

  return {
    rootNodes,
    maxDepth,
  };
}
