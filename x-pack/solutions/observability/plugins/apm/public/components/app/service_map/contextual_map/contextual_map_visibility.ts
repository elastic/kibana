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
  hiddenServiceCountByNodeId: Map<string, number>;
  /** Hidden service neighbors with active alerts */
  hiddenAttentionCountByNodeId: Map<string, number>;
}

function countHiddenNeighbors({
  visibleNodeIds,
  adjacency,
  nodeById,
}: {
  visibleNodeIds: Set<string>;
  adjacency: Map<string, Set<string>>;
  nodeById: Map<string, ServiceMapNode>;
}): Pick<
  ExpandableVisibilityResult,
  'hiddenNeighborCountByNodeId' | 'hiddenServiceCountByNodeId' | 'hiddenAttentionCountByNodeId'
> {
  const hiddenNeighborCountByNodeId = new Map<string, number>();
  const hiddenServiceCountByNodeId = new Map<string, number>();
  const hiddenAttentionCountByNodeId = new Map<string, number>();

  for (const visibleId of Array.from(visibleNodeIds)) {
    let hiddenNeighbors = 0;
    let hiddenServices = 0;
    let hiddenAttention = 0;

    for (const neighborId of Array.from(adjacency.get(visibleId) ?? [])) {
      if (visibleNodeIds.has(neighborId)) {
        continue;
      }
      hiddenNeighbors += 1;
      const neighbor = nodeById.get(neighborId);
      if (neighbor && isServiceNode(neighbor) && isServiceNodeData(neighbor.data)) {
        hiddenServices += 1;
        const data = neighbor.data as ServiceNodeData;
        if ((data.alertsCount ?? 0) > 0) {
          hiddenAttention += 1;
        }
      }
    }

    if (hiddenNeighbors > 0) {
      hiddenNeighborCountByNodeId.set(visibleId, hiddenNeighbors);
    }
    if (hiddenServices > 0) {
      hiddenServiceCountByNodeId.set(visibleId, hiddenServices);
    }
    if (hiddenAttention > 0) {
      hiddenAttentionCountByNodeId.set(visibleId, hiddenAttention);
    }
  }

  return {
    hiddenNeighborCountByNodeId,
    hiddenServiceCountByNodeId,
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
    for (const neighborId of Array.from(adjacency.get(expandId) ?? [])) {
      if (nodeIds.has(neighborId)) {
        visibleNodeIds.add(neighborId);
      }
    }
  }

  const hiddenCounts = countHiddenNeighbors({
    visibleNodeIds,
    adjacency,
    nodeById,
  });

  const visibility: ExpandableVisibilityResult = {
    visibleNodeIds,
    ...hiddenCounts,
    totalHiddenCount: nodeIds.size - visibleNodeIds.size,
  };

  const filteredNodes = nodes.filter((node) => visibility.visibleNodeIds.has(node.id));
  const filteredEdges = edges.filter(
    (edge) =>
      visibility.visibleNodeIds.has(edge.source) && visibility.visibleNodeIds.has(edge.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges, visibility };
}
