/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ServiceMapEdge,
  ServiceMapNode,
  ServiceNodeData,
} from '../../../../../common/service_map';
import { isServiceNode, isServiceNodeData } from '../../../../../common/service_map';
import {
  buildUndirectedAdjacency,
  computeHopDepthVisibilityWithCap,
  type HopDepthResult,
} from './hop_depth_visibility';

export interface ExpandableVisibilityResult extends HopDepthResult {
  /** Hidden service dependencies with active alerts */
  hiddenAttentionCountByNodeId: Map<string, number>;
}

function countHiddenDependencies({
  visibleNodeIds,
  adjacency,
  nodeById,
}: {
  visibleNodeIds: Set<string>;
  adjacency: Map<string, Set<string>>;
  nodeById: Map<string, ServiceMapNode>;
}): Pick<
  ExpandableVisibilityResult,
  'hiddenDependencyCountByNodeId' | 'hiddenAttentionCountByNodeId'
> {
  const hiddenDependencyCountByNodeId = new Map<string, number>();
  const hiddenAttentionCountByNodeId = new Map<string, number>();

  for (const visibleId of Array.from(visibleNodeIds)) {
    let hiddenDependencies = 0;
    let hiddenAttention = 0;

    for (const dependencyId of Array.from(adjacency.get(visibleId) ?? [])) {
      if (visibleNodeIds.has(dependencyId)) {
        continue;
      }
      hiddenDependencies += 1;
      const dependency = nodeById.get(dependencyId);
      if (dependency && isServiceNode(dependency) && isServiceNodeData(dependency.data)) {
        const data = dependency.data as ServiceNodeData;
        if ((data.alertsCount ?? 0) > 0) {
          hiddenAttention += 1;
        }
      }
    }

    if (hiddenDependencies > 0) {
      hiddenDependencyCountByNodeId.set(visibleId, hiddenDependencies);
    }
    if (hiddenAttention > 0) {
      hiddenAttentionCountByNodeId.set(visibleId, hiddenAttention);
    }
  }

  return {
    hiddenDependencyCountByNodeId,
    hiddenAttentionCountByNodeId,
  };
}

export function filterServiceMapWithExpansions({
  focalNodeId,
  baseMaxHops,
  maxVisibleNodes,
  expandedNodeIds,
  nodes,
  edges,
}: {
  focalNodeId: string;
  baseMaxHops: number;
  maxVisibleNodes: number;
  expandedNodeIds: ReadonlySet<string>;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
}): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  visibility: ExpandableVisibilityResult;
} {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = buildUndirectedAdjacency(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

  const base = computeHopDepthVisibilityWithCap({
    focalNodeId,
    maxHops: baseMaxHops,
    maxVisibleNodes,
    nodeIds,
    edges,
  });

  const visibleNodeIds = new Set(base.visibleNodeIds);

  for (const expandId of expandedNodeIds) {
    if (!visibleNodeIds.has(expandId)) {
      continue;
    }
    for (const dependencyId of Array.from(adjacency.get(expandId) ?? [])) {
      if (nodeIds.has(dependencyId)) {
        visibleNodeIds.add(dependencyId);
      }
    }
  }

  const hiddenCounts = countHiddenDependencies({
    visibleNodeIds,
    adjacency,
    nodeById,
  });

  const visibility: ExpandableVisibilityResult = {
    visibleNodeIds,
    hiddenDependencyCountByNodeId: hiddenCounts.hiddenDependencyCountByNodeId,
    totalHiddenCount: nodeIds.size - visibleNodeIds.size,
    hiddenAttentionCountByNodeId: hiddenCounts.hiddenAttentionCountByNodeId,
  };

  const filteredNodes = nodes.filter((node) => visibility.visibleNodeIds.has(node.id));
  const filteredEdges = edges.filter(
    (edge) =>
      visibility.visibleNodeIds.has(edge.source) && visibility.visibleNodeIds.has(edge.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges, visibility };
}
