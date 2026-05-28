/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapEdge } from '../../../../../common/service_map';

export interface HopDepthResult {
  visibleNodeIds: Set<string>;
  hiddenNeighborCountByNodeId: Map<string, number>;
  totalHiddenCount: number;
}

export function buildUndirectedAdjacency(edges: ServiceMapEdge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    let neighbors = adjacency.get(a);
    if (!neighbors) {
      neighbors = new Set();
      adjacency.set(a, neighbors);
    }
    neighbors.add(b);
  };
  for (const edge of edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }
  return adjacency;
}

/** BFS from focal service; stops at maxHops and when visible nodes reach maxVisibleNodes. */
export function computeHopDepthVisibilityWithCap({
  focalNodeId,
  maxHops,
  maxVisibleNodes,
  nodeIds,
  edges,
}: {
  focalNodeId: string;
  maxHops: number;
  maxVisibleNodes: number;
  nodeIds: Set<string>;
  edges: ServiceMapEdge[];
}): HopDepthResult {
  const adjacency = buildUndirectedAdjacency(edges);
  const visibleNodeIds = new Set<string>();
  const distances = new Map<string, number>();

  if (!nodeIds.has(focalNodeId) || maxVisibleNodes <= 0) {
    return {
      visibleNodeIds,
      hiddenNeighborCountByNodeId: new Map(),
      totalHiddenCount: nodeIds.size,
    };
  }

  const queue: Array<{ id: string; distance: number }> = [{ id: focalNodeId, distance: 0 }];
  distances.set(focalNodeId, 0);
  visibleNodeIds.add(focalNodeId);

  while (queue.length > 0 && visibleNodeIds.size < maxVisibleNodes) {
    const current = queue.shift()!;
    if (current.distance >= maxHops) {
      continue;
    }
    for (const neighborId of Array.from(adjacency.get(current.id) ?? [])) {
      if (!nodeIds.has(neighborId) || visibleNodeIds.size >= maxVisibleNodes) {
        continue;
      }
      const nextDistance = current.distance + 1;
      if (distances.has(neighborId) && distances.get(neighborId)! <= nextDistance) {
        continue;
      }
      distances.set(neighborId, nextDistance);
      visibleNodeIds.add(neighborId);
      if (nextDistance < maxHops && visibleNodeIds.size < maxVisibleNodes) {
        queue.push({ id: neighborId, distance: nextDistance });
      }
    }
  }

  const hiddenNeighborCountByNodeId = new Map<string, number>();
  for (const visibleId of Array.from(visibleNodeIds)) {
    let hiddenNeighbors = 0;
    for (const neighborId of Array.from(adjacency.get(visibleId) ?? [])) {
      if (!visibleNodeIds.has(neighborId)) {
        hiddenNeighbors += 1;
      }
    }
    if (hiddenNeighbors > 0) {
      hiddenNeighborCountByNodeId.set(visibleId, hiddenNeighbors);
    }
  }

  return {
    visibleNodeIds,
    hiddenNeighborCountByNodeId,
    totalHiddenCount: nodeIds.size - visibleNodeIds.size,
  };
}
