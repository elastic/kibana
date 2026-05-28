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
import type { ConnectionFilter, ServiceMapViewFilters } from '../apply_service_map_visibility';
import {
  buildConnectedNodeIdSet,
  getMlSeverityForServiceMapNode,
  getNormalizedSloStatusForMapFilters,
  getServiceNodeAlertCountForStatus,
} from '../apply_service_map_visibility';

export function hasActiveServiceMapViewFilters(filters: ServiceMapViewFilters): boolean {
  return (
    filters.alertStatusFilter.length > 0 ||
    filters.sloStatusFilter.length > 0 ||
    filters.anomalySeverityFilter.length > 0 ||
    filters.connectionFilter.length > 0
  );
}

function nodeMatchesConnectionFilter(
  nodeId: string,
  filter: ConnectionFilter,
  connectedIds: Set<string>
): boolean {
  switch (filter) {
    case 'orphaned':
      return !connectedIds.has(nodeId);
    case 'connected':
      return connectedIds.has(nodeId);
  }
}

function serviceNodeMatchesViewFilters(
  data: ServiceNodeData,
  nodeId: string,
  connectedIds: Set<string>,
  filters: ServiceMapViewFilters
): boolean {
  if (filters.connectionFilter.length > 0) {
    const matchesAnyConnection = filters.connectionFilter.some((f) =>
      nodeMatchesConnectionFilter(nodeId, f, connectedIds)
    );
    if (!matchesAnyConnection) return false;
  }

  if (filters.alertStatusFilter.length > 0) {
    const matchesAny = filters.alertStatusFilter.some(
      (status) => getServiceNodeAlertCountForStatus(data, status) > 0
    );
    if (!matchesAny) {
      return false;
    }
  }

  if (filters.sloStatusFilter.length > 0) {
    const slo = getNormalizedSloStatusForMapFilters(data);
    if (!filters.sloStatusFilter.includes(slo)) {
      return false;
    }
  }

  if (filters.anomalySeverityFilter.length > 0) {
    const severity = getMlSeverityForServiceMapNode(data);
    if (!filters.anomalySeverityFilter.includes(severity)) {
      return false;
    }
  }

  return true;
}
import {
  buildUndirectedAdjacency,
  computeHopDepthVisibilityWithCap,
  type HopDepthResult,
} from './service_contextual_map_utils';

export interface ExpandableVisibilityResult extends HopDepthResult {
  hiddenServiceCountByNodeId: Map<string, number>;
  /** Hidden service neighbors with active alerts (no filter applied) */
  hiddenAttentionCountByNodeId: Map<string, number>;
  /** Hidden service neighbors matching active view filters (full query) */
  hiddenMatchingServiceCountByNodeId: Map<string, number>;
}

function getMatchingServiceIds(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  viewFilters: ServiceMapViewFilters
): Set<string> | null {
  if (!hasActiveServiceMapViewFilters(viewFilters)) {
    return null;
  }
  const connectedIds = buildConnectedNodeIdSet(edges);
  const matching = new Set<string>();
  for (const node of nodes) {
    if (
      isServiceNode(node) &&
      isServiceNodeData(node.data) &&
      serviceNodeMatchesViewFilters(node.data, node.id, connectedIds, viewFilters)
    ) {
      matching.add(node.id);
    }
  }
  return matching;
}

function countHiddenNeighbors({
  visibleNodeIds,
  adjacency,
  nodeById,
  matchingServiceIds,
}: {
  visibleNodeIds: Set<string>;
  adjacency: Map<string, Set<string>>;
  nodeById: Map<string, ServiceMapNode>;
  matchingServiceIds: Set<string> | null;
}): Pick<
  ExpandableVisibilityResult,
  | 'hiddenNeighborCountByNodeId'
  | 'hiddenServiceCountByNodeId'
  | 'hiddenAttentionCountByNodeId'
  | 'hiddenMatchingServiceCountByNodeId'
> {
  const hiddenNeighborCountByNodeId = new Map<string, number>();
  const hiddenServiceCountByNodeId = new Map<string, number>();
  const hiddenAttentionCountByNodeId = new Map<string, number>();
  const hiddenMatchingServiceCountByNodeId = new Map<string, number>();

  for (const visibleId of Array.from(visibleNodeIds)) {
    let hiddenNeighbors = 0;
    let hiddenServices = 0;
    let hiddenAttention = 0;
    let hiddenMatching = 0;

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
        if (matchingServiceIds?.has(neighborId)) {
          hiddenMatching += 1;
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
    if (hiddenMatching > 0) {
      hiddenMatchingServiceCountByNodeId.set(visibleId, hiddenMatching);
    }
  }

  return {
    hiddenNeighborCountByNodeId,
    hiddenServiceCountByNodeId,
    hiddenAttentionCountByNodeId,
    hiddenMatchingServiceCountByNodeId,
  };
}

/**
 * Base hop + node cap from focal service, plus one-hop reveal per expanded node.
 * Hidden counts respect view filters across the full query (#5428).
 */
export function computeVisibilityWithExpansions({
  focalNodeId,
  baseMaxHops,
  maxVisibleNodes,
  expandedNodeIds,
  nodes,
  edges,
  viewFilters,
}: {
  focalNodeId: string;
  baseMaxHops: number;
  maxVisibleNodes: number;
  expandedNodeIds: ReadonlySet<string>;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  viewFilters: ServiceMapViewFilters;
}): ExpandableVisibilityResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacency = buildUndirectedAdjacency(edges);
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
  const matchingServiceIds = getMatchingServiceIds(nodes, edges, viewFilters);

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
    matchingServiceIds,
  });

  return {
    visibleNodeIds,
    ...hiddenCounts,
    totalHiddenCount: nodeIds.size - visibleNodeIds.size,
  };
}

export function filterServiceMapWithExpansions({
  focalNodeId,
  baseMaxHops,
  maxVisibleNodes,
  expandedNodeIds,
  nodes,
  edges,
  viewFilters,
}: {
  focalNodeId: string;
  baseMaxHops: number;
  maxVisibleNodes: number;
  expandedNodeIds: ReadonlySet<string>;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  viewFilters: ServiceMapViewFilters;
}): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  visibility: ExpandableVisibilityResult;
} {
  const visibility = computeVisibilityWithExpansions({
    focalNodeId,
    baseMaxHops,
    maxVisibleNodes,
    expandedNodeIds,
    nodes,
    edges,
    viewFilters,
  });

  const filteredNodes = nodes.filter((node) => visibility.visibleNodeIds.has(node.id));
  const filteredEdges = edges.filter(
    (edge) =>
      visibility.visibleNodeIds.has(edge.source) && visibility.visibleNodeIds.has(edge.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges, visibility };
}
