/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { SloStatus } from '../../../../common/service_inventory';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import type {
  ServiceMapEdge as ServiceMapEdgeType,
  ServiceMapNode,
  ServiceNodeData,
} from '../../../../common/service_map';
import { isServiceNode, isServiceNodeData } from '../../../../common/service_map';

/**
 * Connection-based filter values. `null` = show all.
 * - `orphanedOnly` / `hideOrphaned`: filter by 0 connections (orphan = no edges at all).
 * - `depth1`: show services whose connected component has a chain depth of exactly 1
 *   (e.g. A-B). All nodes in the component are shown together.
 */
export type ConnectionFilter = 'orphanedOnly' | 'hideOrphaned' | 'depth1';

export interface ServiceMapViewFilters {
  /** Empty = show all alert statuses. If non-empty, service must have ≥1 alert in any selected status. */
  alertStatusFilter: AlertStatus[];
  sloStatusFilter: SloStatus[];
  anomalyStatusFilter: ServiceHealthStatus[];
  /** Empty = show all. If non-empty, service must match at least one selected connection filter (OR). */
  connectionFilter: ConnectionFilter[];
}

export const DEFAULT_SERVICE_MAP_VIEW_FILTERS: ServiceMapViewFilters = {
  alertStatusFilter: [],
  sloStatusFilter: [],
  anomalyStatusFilter: [],
  connectionFilter: [],
};

/** Returns the number of edges that touch `nodeId` (as source or target). */
export function getNodeConnectionCount(nodeId: string, edges: ServiceMapEdgeType[]): number {
  let count = 0;
  for (const edge of edges) {
    if (edge.source === nodeId || edge.target === nodeId) {
      count++;
    }
  }
  return count;
}

/**
 * Computes the chain depth (diameter) for each node's connected component.
 * Diameter = the longest shortest-path between any two nodes in the component.
 * Orphan nodes (no edges) get depth 0. A-B gets depth 1. C-D-E gets depth 2.
 * All nodes in the same component share the same depth value.
 */
export function getComponentDepthByNode(
  nodeIds: Set<string>,
  edges: ServiceMapEdgeType[]
): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    adjacency.set(id, []);
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      adjacency.get(edge.target)!.push(edge.source);
    }
  }

  const depthByNode = new Map<string, number>();
  const visited = new Set<string>();

  for (const startId of nodeIds) {
    if (visited.has(startId)) continue;

    // BFS to find the component
    const component: string[] = [];
    const bfsQueue = [startId];
    visited.add(startId);
    for (let i = 0; i < bfsQueue.length; i++) {
      const id = bfsQueue[i]!;
      component.push(id);
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          bfsQueue.push(neighbor);
        }
      }
    }

    // Compute diameter via BFS from each node in the component (exact for small components)
    let diameter = 0;
    for (const source of component) {
      const dist = new Map<string, number>();
      dist.set(source, 0);
      const q = [source];
      for (let i = 0; i < q.length; i++) {
        const cur = q[i]!;
        const d = dist.get(cur)!;
        for (const neighbor of adjacency.get(cur) ?? []) {
          if (!dist.has(neighbor)) {
            dist.set(neighbor, d + 1);
            q.push(neighbor);
            if (d + 1 > diameter) diameter = d + 1;
          }
        }
      }
    }

    for (const id of component) {
      depthByNode.set(id, diameter);
    }
  }

  return depthByNode;
}

/**
 * SLO bucket for map filters and option counts: `undefined` or `noSLOs` (no SLO summary on the node)
 * is treated as **`noData`** so tallies and combo options stay aligned with `SloStatus`.
 */
export function getNormalizedSloStatusForMapFilters(data: ServiceNodeData): SloStatus {
  const raw = data.sloStatus;
  if (raw === undefined || raw === 'noSLOs') {
    return 'noData';
  }
  return raw;
}

/** Alert count for a status on one service (used by filters and filter-option counts). */
export function getServiceNodeAlertCountForStatus(
  data: ServiceNodeData,
  status: AlertStatus
): number {
  const fromBreakdown = data.alertsByStatus?.[status];
  if (fromBreakdown !== undefined) {
    return fromBreakdown;
  }
  if (status === ALERT_STATUS_ACTIVE && data.alertsCount !== undefined) {
    return data.alertsCount;
  }
  return 0;
}

function nodeMatchesConnectionFilter(
  nodeId: string,
  filter: ConnectionFilter,
  edges: ServiceMapEdgeType[],
  componentDepth?: Map<string, number>
): boolean {
  switch (filter) {
    case 'orphanedOnly':
      return getNodeConnectionCount(nodeId, edges) === 0;
    case 'hideOrphaned':
      return getNodeConnectionCount(nodeId, edges) > 0;
    case 'depth1':
      return (componentDepth?.get(nodeId) ?? 0) === 1;
  }
}

function serviceMatchesFilters(
  data: ServiceNodeData,
  nodeId: string,
  edges: ServiceMapEdgeType[],
  filters: ServiceMapViewFilters,
  componentDepth?: Map<string, number>
): boolean {
  if (filters.connectionFilter.length > 0) {
    const matchesAnyConnection = filters.connectionFilter.some((f) =>
      nodeMatchesConnectionFilter(nodeId, f, edges, componentDepth)
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

  if (filters.anomalyStatusFilter.length > 0) {
    const health = data.serviceAnomalyStats?.healthStatus ?? ServiceHealthStatus.unknown;
    if (!filters.anomalyStatusFilter.includes(health)) {
      return false;
    }
  }

  return true;
}

/**
 * Applies client-side visibility for service map nodes and edges. Service nodes must match all
 * active filters. Dependency and grouped nodes are shown when connected to any visible node;
 * non-matching services are never pulled in through dependencies.
 */
export function applyServiceMapVisibility(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdgeType[],
  filters: ServiceMapViewFilters
): { nodes: ServiceMapNode[]; edges: ServiceMapEdgeType[] } {
  const visibleIds = new Set<string>();
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));

  // Pre-compute component depths when a depth-based filter is active.
  const needsDepth = filters.connectionFilter.includes('depth1');
  const componentDepth = needsDepth
    ? getComponentDepthByNode(new Set(nodes.map((n) => n.id)), edges)
    : undefined;

  for (const node of nodes) {
    if (
      isServiceNodeData(node.data) &&
      serviceMatchesFilters(node.data, node.id, edges, filters, componentDepth)
    ) {
      visibleIds.add(node.id);
    }
  }

  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    let na = adjacency.get(a);
    if (!na) {
      na = [];
      adjacency.set(a, na);
    }
    na.push(b);
  };
  for (const edge of edges) {
    link(edge.source, edge.target);
    link(edge.target, edge.source);
  }

  const queue = [...visibleIds];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    for (const neighborId of adjacency.get(id) ?? []) {
      if (visibleIds.has(neighborId)) {
        continue;
      }
      const neighbor = nodeById.get(neighborId);
      if (!neighbor || isServiceNode(neighbor)) {
        continue;
      }
      visibleIds.add(neighborId);
      queue.push(neighborId);
    }
  }

  return {
    nodes: nodes.map((node) => ({
      ...node,
      hidden: !visibleIds.has(node.id),
    })),
    edges: edges.map((edge) => ({
      ...edge,
      hidden: !visibleIds.has(edge.source) || !visibleIds.has(edge.target),
    })),
  };
}
