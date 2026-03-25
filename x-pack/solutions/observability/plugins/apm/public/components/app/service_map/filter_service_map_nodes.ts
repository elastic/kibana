/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceHealthStatus } from '../../../../common/service_health_status';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  ServiceNodeData,
} from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import type { ServiceMapControlState } from './service_map_control_state';

function applyBadgeVisibility(node: ServiceMapNode, state: ServiceMapControlState): ServiceMapNode {
  if (node.type !== 'service' || !isServiceNodeData(node.data)) return node;
  const data = node.data as ServiceNodeData;
  return {
    ...node,
    data: {
      ...data,
      ...(state.showAlertsBadge ? {} : { alertsCount: undefined }),
      ...(state.showSloBadge ? {} : { sloCount: undefined, sloStatus: undefined }),
      ...(state.showAnomalyBadge ? {} : { serviceAnomalyStats: undefined }),
    },
  };
}

function serviceNodePassesFilters(node: ServiceMapNode, state: ServiceMapControlState): boolean {
  if (node.type !== 'service' || !isServiceNodeData(node.data)) return true;
  const data = node.data as ServiceNodeData;

  if (state.showOnlyActiveAlerts && (data.alertsCount ?? 0) === 0) {
    return false;
  }

  if (state.sloStatusFilter.length > 0) {
    const status = data.sloStatus ?? 'noData';
    if (!state.sloStatusFilter.includes(status)) return false;
  }

  if (state.anomalyStatusFilter.length > 0) {
    const status = data.serviceAnomalyStats?.healthStatus ?? ServiceHealthStatus.unknown;
    if (!state.anomalyStatusFilter.includes(status)) return false;
  }

  return true;
}

/**
 * Filters and transforms nodes and edges based on control state.
 * - Filters out service nodes that don't match alerts/SLO/anomaly filters.
 * - Removes edges whose source or target is a removed node.
 * - Removes dependency nodes that are no longer connected to any remaining service node.
 * - Applies badge visibility (strips badge data when toggles are off).
 */
export function filterServiceMapElements(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  state: ServiceMapControlState
): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  const serviceNodeIds = new Set(
    nodes.filter((n) => n.type === 'service' && isServiceNodeData(n.data)).map((n) => n.id)
  );
  const keptServiceIds = new Set(
    nodes
      .filter((n) => serviceNodeIds.has(n.id) && serviceNodePassesFilters(n, state))
      .map((n) => n.id)
  );

  // Keep only services that pass the filter, plus dependencies/group nodes connected to those services.
  // Do not add service nodes that failed the filter (e.g. services without alerts when "Show only active alerts" is on).
  const keptNodeIds = new Set<string>(keptServiceIds);
  for (const edge of edges) {
    const sourceKept = keptServiceIds.has(edge.source);
    const targetKept = keptServiceIds.has(edge.target);
    if (sourceKept || targetKept) {
      if (sourceKept || !serviceNodeIds.has(edge.source)) keptNodeIds.add(edge.source);
      if (targetKept || !serviceNodeIds.has(edge.target)) keptNodeIds.add(edge.target);
    }
  }

  const filteredNodes = nodes.filter((n) => keptNodeIds.has(n.id));
  const filteredEdges = edges.filter((e) => keptNodeIds.has(e.source) && keptNodeIds.has(e.target));

  const withBadges = filteredNodes.map((node) => applyBadgeVisibility(node, state));

  return { nodes: withBadges, edges: filteredEdges };
}
