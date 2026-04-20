/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { SloStatus } from '../../../../common/service_inventory';
import type { ServiceHealthStatus } from '../../../../common/service_health_status';
import type {
  ServiceMapEdge as ServiceMapEdgeType,
  ServiceMapNode,
  ServiceNodeData,
} from '../../../../common/service_map';
import { isServiceNode, isServiceNodeData } from '../../../../common/service_map';

export interface ServiceMapViewFilters {
  /** Empty = show all alert statuses. If non-empty, service must have ≥1 alert in any selected status. */
  alertStatusFilter: AlertStatus[];
  sloStatusFilter: SloStatus[];
  anomalyStatusFilter: ServiceHealthStatus[];
}

export const DEFAULT_SERVICE_MAP_VIEW_FILTERS: ServiceMapViewFilters = {
  alertStatusFilter: [],
  sloStatusFilter: [],
  anomalyStatusFilter: [],
};

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

function serviceMatchesFilters(data: ServiceNodeData, filters: ServiceMapViewFilters): boolean {
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
    const health = data.serviceAnomalyStats?.healthStatus ?? 'unknown';
    if (!filters.anomalyStatusFilter.includes(health as ServiceHealthStatus)) {
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

  for (const node of nodes) {
    if (isServiceNodeData(node.data) && serviceMatchesFilters(node.data, filters)) {
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
