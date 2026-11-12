/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatus } from '@kbn/rule-data-utils';
import { SLO_STATUS_PRIORITY } from '@kbn/apm-types';
import type {
  ServiceGroupNodeData,
  ServiceGroupingSource,
  ServiceMapEdge,
  ServiceMapGrouping,
  ServiceMapGroup,
  ServiceMapNode,
  ServiceMapServiceStats,
  ServiceNodeData,
} from './types';
import { isServiceNodeData } from './types';
import { formatServiceGroupName } from './format_service_group_name';
import { createEdgeMarker, getEdgeId } from './utils';
import { DEFAULT_EDGE_STYLE } from './constants';

export interface GroupServiceNodesResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
}

/**
 * Collapses services in groups of 2+ into closed service-group nodes for the selected
 * strategy (default: `serviceGrouping.automatic`). Groups of 1 stay as service nodes.
 * Dependencies and resource groups are unchanged. Missing grouping is a no-op.
 */
export function groupServiceNodes(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  serviceGrouping: ServiceMapGrouping | undefined,
  source?: ServiceGroupingSource
): GroupServiceNodesResult {
  if (!serviceGrouping) {
    return { nodes, edges };
  }

  const strategySource = source ?? serviceGrouping.automatic;
  const strategy = serviceGrouping.strategies.find((s) => s.source === strategySource);
  if (!strategy) {
    return { nodes, edges };
  }

  // assignment[i] → group index for services[i]
  const membersByGroup: string[][] = strategy.groups.map(() => []);
  strategy.assignment.forEach((groupIndex, serviceIndex) => {
    const serviceName = serviceGrouping.services[serviceIndex];
    if (serviceName !== undefined && groupIndex >= 0 && groupIndex < membersByGroup.length) {
      membersByGroup[groupIndex].push(serviceName);
    }
  });

  const serviceNodesByName = new Map<string, ServiceMapNode>();
  for (const node of nodes) {
    if (isServiceNodeData(node.data)) {
      serviceNodesByName.set(node.data.label, node);
    }
  }

  // Edge endpoints may use node.id or data.label; map both to the closed group id.
  const endpointToGroupId = new Map<string, string>();
  const closedGroupNodes: ServiceMapNode[] = [];
  const collapsedServiceIds = new Set<string>();

  strategy.groups.forEach((group, groupIndex) => {
    const memberNodes = (membersByGroup[groupIndex] ?? [])
      .map((name) => serviceNodesByName.get(name))
      .filter((node): node is ServiceMapNode => node !== undefined);

    // Groups of 1 stay as ordinary service nodes
    if (memberNodes.length < 2) {
      return;
    }

    const groupNode = createServiceGroupNode(group, memberNodes);
    closedGroupNodes.push(groupNode);

    for (const member of memberNodes) {
      collapsedServiceIds.add(member.id);
      endpointToGroupId.set(member.id, groupNode.id);
      endpointToGroupId.set(member.data.label, groupNode.id);
    }
  });

  if (closedGroupNodes.length === 0) {
    return { nodes, edges };
  }

  const nextNodes = [
    ...nodes.filter((node) => !collapsedServiceIds.has(node.id)),
    ...closedGroupNodes,
  ];
  const nextEdges = rewriteEdges(
    edges,
    (endpointId) => endpointToGroupId.get(endpointId) ?? endpointId,
    collapsedServiceIds
  );

  return { nodes: nextNodes, edges: nextEdges };
}

function createServiceGroupNode(
  group: ServiceMapGroup,
  memberNodes: ServiceMapNode[]
): ServiceMapNode {
  const members = memberNodes.map((node) => node.data as ServiceNodeData);

  return {
    id: group.id,
    type: 'serviceGroup',
    position: { x: 0, y: 0 },
    data: {
      id: group.id,
      label: formatServiceGroupName(group),
      isService: false,
      isServiceGroup: true,
      groupKind: group.kind,
      memberServiceIds: members.map((m) => m.id),
      memberCount: members.length,
      ...rollupMemberFields(members),
    },
  };
}

/** Merge member badges/stats onto the closed group (omit fields nobody had). */
function rollupMemberFields(
  members: ServiceNodeData[]
): Pick<
  ServiceGroupNodeData,
  'stats' | 'alertsCount' | 'alertsByStatus' | 'sloStatus' | 'sloCount' | 'serviceAnomalyStats'
> {
  const stats = rollupStats(members);
  const alertsCount = sumDefined(members.map((m) => m.alertsCount));
  const alertsByStatus = rollupAlertsByStatus(members);
  const { sloStatus, sloCount } = rollupSlo(members);
  const serviceAnomalyStats = highestAnomaly(members);

  return {
    ...(stats ? { stats } : {}),
    ...(alertsCount !== undefined ? { alertsCount } : {}),
    ...(alertsByStatus ? { alertsByStatus } : {}),
    ...(sloStatus !== undefined ? { sloStatus } : {}),
    ...(sloCount !== undefined ? { sloCount } : {}),
    ...(serviceAnomalyStats ? { serviceAnomalyStats } : {}),
  };
}

function rollupStats(members: ServiceNodeData[]): ServiceMapServiceStats | undefined {
  let throughput = 0;
  let requestCount = 0;
  let failedWeighted = 0;
  let failedWeight = 0;
  let worstLatency: number | null = null;
  let transactionType: string | undefined;
  let hasStats = false;

  for (const member of members) {
    const { stats } = member;
    if (!stats) {
      continue;
    }
    hasStats = true;
    transactionType ??= stats.transactionType;
    throughput += stats.throughput;
    requestCount += stats.requestCount;

    if (typeof stats.failedTransactionRate === 'number') {
      failedWeighted += stats.failedTransactionRate * stats.requestCount;
      failedWeight += stats.requestCount;
    }
    if (typeof stats.latency === 'number') {
      worstLatency = worstLatency === null ? stats.latency : Math.max(worstLatency, stats.latency);
    }
  }

  if (!hasStats || transactionType === undefined) {
    return undefined;
  }

  return {
    transactionType,
    throughput,
    requestCount,
    // Weighted by request count so busier members count more; null rates are skipped
    failedTransactionRate: failedWeight > 0 ? failedWeighted / failedWeight : null,
    latency: worstLatency,
  };
}

function sumDefined(values: Array<number | undefined>): number | undefined {
  let sum = 0;
  let sawValue = false;
  for (const value of values) {
    if (value === undefined) {
      continue;
    }
    sawValue = true;
    sum += value;
  }
  return sawValue ? sum : undefined;
}

function rollupAlertsByStatus(
  members: ServiceNodeData[]
): Partial<Record<AlertStatus, number>> | undefined {
  const merged: Partial<Record<AlertStatus, number>> = {};
  let hasAlertsByStatus = false;

  for (const member of members) {
    if (!member.alertsByStatus) {
      continue;
    }
    hasAlertsByStatus = true;
    for (const [status, count] of Object.entries(member.alertsByStatus) as Array<
      [AlertStatus, number]
    >) {
      merged[status] = (merged[status] ?? 0) + count;
    }
  }

  return hasAlertsByStatus ? merged : undefined;
}

function rollupSlo(members: ServiceNodeData[]): {
  sloStatus?: ServiceNodeData['sloStatus'];
  sloCount?: number;
} {
  const statuses = new Set<ServiceNodeData['sloStatus']>();
  let sloCount = 0;
  let sawSloCount = false;

  for (const member of members) {
    if (member.sloCount !== undefined) {
      sawSloCount = true;
      sloCount += member.sloCount;
    }
    if (member.sloStatus !== undefined) {
      statuses.add(member.sloStatus);
    }
  }

  if (statuses.size === 0 && !sawSloCount) {
    return {};
  }

  const sloStatus = pickWorstSloStatus(statuses);
  return {
    ...(sloStatus !== undefined ? { sloStatus } : {}),
    ...(sawSloCount ? { sloCount } : {}),
  };
}

function pickWorstSloStatus(
  statuses: Set<ServiceNodeData['sloStatus']>
): ServiceNodeData['sloStatus'] | undefined {
  for (const priority of SLO_STATUS_PRIORITY) {
    if (statuses.has(priority)) {
      return priority;
    }
  }
  if (statuses.has('noSLOs')) {
    return 'noSLOs';
  }
  return undefined;
}

function highestAnomaly(members: ServiceNodeData[]): ServiceNodeData['serviceAnomalyStats'] {
  let worst: ServiceNodeData['serviceAnomalyStats'];

  for (const member of members) {
    const candidate = member.serviceAnomalyStats;
    const score = candidate?.anomalyScore;
    if (score === undefined) {
      continue;
    }
    // Same “keep highest score” check as service-map anomaly fetch / agent builder
    if (worst?.anomalyScore === undefined || score > worst.anomalyScore) {
      worst = candidate;
    }
  }

  return worst;
}

function rewriteEdges(
  edges: ServiceMapEdge[],
  remapEndpoint: (id: string) => string,
  collapsedServiceIds: Set<string>
): ServiceMapEdge[] {
  const merged = new Map<string, ServiceMapEdge>();

  for (const edge of edges) {
    const source = remapEndpoint(edge.source);
    const target = remapEndpoint(edge.target);

    // Intra-group link (e.g. frontend→cart inside shop) — drop
    if (source === target) {
      continue;
    }

    // Safety net: after remap, endpoints should be group ids or untouched nodes.
    // Skip anything that still points at a collapsed service (bad/partial mapping).
    if (collapsedServiceIds.has(source) || collapsedServiceIds.has(target)) {
      continue;
    }

    const id = getEdgeId(source, target);
    if (merged.has(id)) {
      // e.g. checkout→postgres and cart→postgres both become shop→postgres
      continue;
    }

    merged.set(id, {
      ...edge,
      id,
      source,
      target,
      style: edge.style ?? DEFAULT_EDGE_STYLE,
      markerEnd: edge.markerEnd ?? createEdgeMarker(DEFAULT_EDGE_STYLE.stroke),
    });
  }

  return [...merged.values()];
}
