/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Storybook / exploration helpers for service-contextual map options (#5453, #5428).
 * Not used in production until an approach is chosen.
 */

import { MarkerType } from '@xyflow/react';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type {
  ServiceMapEdge,
  ServiceMapNode,
  ServiceNodeData,
} from '../../../../../common/service_map';
import { isServiceNode } from '../../../../../common/service_map';

/** Default cap for visible nodes in service-contextual map (#5428). */
export const CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES = 8;

export interface HopDepthResult {
  /** Node ids visible at the current hop limit */
  visibleNodeIds: Set<string>;
  /** Per visible node: how many direct neighbors are hidden */
  hiddenNeighborCountByNodeId: Map<string, number>;
  /** Total nodes hidden from the full graph */
  totalHiddenCount: number;
}

export interface FilteredServiceMapElements {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  hopDepth: HopDepthResult;
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

/**
 * BFS from focal node; each traversed edge adds one hop. Dependencies and services
 * both count as hops (matches visual steps on the map).
 */
export function computeHopDepthVisibility({
  focalNodeId,
  maxHops,
  nodeIds,
  edges,
}: {
  focalNodeId: string;
  maxHops: number;
  nodeIds: Set<string>;
  edges: ServiceMapEdge[];
}): HopDepthResult {
  const adjacency = buildUndirectedAdjacency(edges);
  const visibleNodeIds = new Set<string>();
  const distances = new Map<string, number>();

  if (!nodeIds.has(focalNodeId)) {
    return {
      visibleNodeIds,
      hiddenNeighborCountByNodeId: new Map(),
      totalHiddenCount: nodeIds.size,
    };
  }

  const queue: Array<{ id: string; distance: number }> = [{ id: focalNodeId, distance: 0 }];
  distances.set(focalNodeId, 0);
  visibleNodeIds.add(focalNodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.distance >= maxHops) {
      continue;
    }
    for (const neighborId of Array.from(adjacency.get(current.id) ?? [])) {
      if (!nodeIds.has(neighborId)) {
        continue;
      }
      const nextDistance = current.distance + 1;
      if (distances.has(neighborId) && distances.get(neighborId)! <= nextDistance) {
        continue;
      }
      distances.set(neighborId, nextDistance);
      visibleNodeIds.add(neighborId);
      if (nextDistance < maxHops) {
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

/**
 * BFS from focal service; stops at maxHops and when visible nodes reach maxVisibleNodes (A/C cap).
 */
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

export function filterServiceMapByHopDepth({
  focalNodeId,
  maxHops,
  nodes,
  edges,
}: {
  focalNodeId: string;
  maxHops: number;
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
}): FilteredServiceMapElements {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const hopDepth = computeHopDepthVisibility({
    focalNodeId,
    maxHops,
    nodeIds,
    edges,
  });

  // Return only the visible subgraph. ServiceMapGraph runs applyServiceMapVisibility with
  // default filters, which would reset `hidden` on nodes — so we must omit hidden nodes here.
  const filteredNodes = nodes.filter((node) => hopDepth.visibleNodeIds.has(node.id));
  const filteredEdges = edges.filter(
    (edge) => hopDepth.visibleNodeIds.has(edge.source) && hopDepth.visibleNodeIds.has(edge.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    hopDepth,
  };
}

/** Linear chain for hop-depth demos: frontend → svc-1 → … → svc-n → db */
export function createChainServiceMap(chainLength: number): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  focalServiceId: string;
} {
  const focalServiceId = 'frontend';
  const nodes: ServiceMapNode[] = [
    {
      id: focalServiceId,
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        id: focalServiceId,
        label: focalServiceId,
        isService: true,
        agentName: 'rum-js' as AgentName,
      },
    },
  ];
  const edges: ServiceMapEdge[] = [];

  let previousId = focalServiceId;
  for (let i = 1; i <= chainLength; i++) {
    const serviceId = `service-${i}`;
    const data: ServiceNodeData = {
      id: serviceId,
      label: serviceId,
      isService: true,
      agentName: 'java',
      ...(i % 3 === 0 ? { alertsCount: 2 + (i % 5) } : {}),
    };
    nodes.push({
      id: serviceId,
      type: 'service',
      position: { x: 0, y: 0 },
      data,
    });
    edges.push({
      id: `${previousId}~${serviceId}`,
      source: previousId,
      target: serviceId,
      data: {
        isBidirectional: false,
        sourceData: { id: previousId },
        targetData: { id: serviceId },
      },
      type: 'default',
      style: { stroke: '#c8c8c8', strokeWidth: 1 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#c8c8c8',
      },
    } as ServiceMapEdge);
    previousId = serviceId;
  }

  const dbId = '>postgresql';
  nodes.push({
    id: dbId,
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: dbId,
      label: 'postgresql',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
  });
  edges.push({
    id: `${previousId}~${dbId}`,
    source: previousId,
    target: dbId,
    data: {
      isBidirectional: false,
      sourceData: { id: previousId },
      targetData: { id: dbId },
    },
    type: 'default',
    style: { stroke: '#c8c8c8', strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: '#c8c8c8',
    },
  } as ServiceMapEdge);

  return { nodes, edges, focalServiceId };
}

export function countVisibleServices(nodes: ServiceMapNode[]): number {
  return nodes.filter((n) => isServiceNode(n)).length;
}

/** Rich demo map for Option B (service-contextual map POC). */
export function createRichContextualServiceMap(): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  focalServiceId: string;
} {
  const focalServiceId = 'api-gateway';

  const mkService = (
    id: string,
    agentName: AgentName = 'java',
    extra?: Partial<ServiceNodeData>
  ): ServiceMapNode => ({
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: true,
      agentName,
      ...extra,
    },
  });

  const mkDep = (
    id: string,
    label: string,
    spanType: string,
    spanSubtype: string
  ): ServiceMapNode => ({
    id,
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: { id, label, isService: false, spanType, spanSubtype },
  });

  const mkEdge = (source: string, target: string): ServiceMapEdge =>
    ({
      id: `${source}~${target}`,
      source,
      target,
      data: {
        isBidirectional: false,
        sourceData: { id: source },
        targetData: { id: target },
      },
      type: 'default',
      style: { stroke: '#c8c8c8', strokeWidth: 1 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#c8c8c8',
      },
    } as ServiceMapEdge);

  const anomaly = (score: number) => ({
    serviceAnomalyStats: {
      anomalyScore: score,
      transactionType: 'request' as const,
      actualValue: 1000,
      jobId: 'demo-job',
    },
  });

  const nodes: ServiceMapNode[] = [
    // Upstream
    mkService('web-frontend', 'rum-js'),
    mkService('mobile-app', 'iOS/swift'),
    mkService('admin-portal', 'rum-js'),
    mkService(focalServiceId, 'nodejs'),
    // Tier 1 downstream
    mkService('order-service', 'java', { alertsCount: 5 }),
    mkService('user-service', 'go', { sloStatus: 'degrading', sloCount: 2 }),
    mkService('catalog-service', 'python'),
    mkService('search-service', 'java', { ...anomaly(75) }),
    mkService('cart-service', 'nodejs', { alertsCount: 2 }),
    mkService('auth-service', 'dotnet', { sloStatus: 'violated', sloCount: 1 }),
    // Tier 2
    mkService('payment-service', 'dotnet', { alertsCount: 3 }),
    mkService('inventory-service', 'java'),
    mkService('fulfillment-service', 'python', { alertsCount: 1 }),
    mkService('profile-service', 'go'),
    mkService('session-service', 'nodejs', { ...anomaly(25) }),
    mkService('pricing-service', 'java', { sloStatus: 'healthy', sloCount: 4 }),
    mkService('recommendation-service', 'python', { ...anomaly(55) }),
    // Tier 3
    mkService('notification-service', 'python', { alertsCount: 2 }),
    mkService('email-worker', 'ruby'),
    mkService('shipping-service', 'ruby', { alertsCount: 4, ...anomaly(90) }),
    mkService('billing-service', 'java', { sloStatus: 'noData' }),
    mkService('tax-service', 'dotnet'),
    mkService('warehouse-service', 'java', { alertsCount: 1 }),
    mkService('returns-service', 'go'),
    mkService('analytics-service', 'python', { ...anomaly(40) }),
    mkService('audit-service', 'java'),
    // Dependencies
    mkDep('>postgresql', 'postgresql', 'db', 'postgresql'),
    mkDep('>redis', 'redis', 'db', 'redis'),
    mkDep('>kafka', 'kafka', 'messaging', 'kafka'),
    mkDep('>elasticsearch', 'elasticsearch', 'db', 'elasticsearch'),
  ];

  const edges: ServiceMapEdge[] = [
    mkEdge('web-frontend', focalServiceId),
    mkEdge('mobile-app', focalServiceId),
    mkEdge('admin-portal', focalServiceId),
    mkEdge(focalServiceId, 'order-service'),
    mkEdge(focalServiceId, 'user-service'),
    mkEdge(focalServiceId, 'catalog-service'),
    mkEdge(focalServiceId, 'search-service'),
    mkEdge(focalServiceId, 'cart-service'),
    mkEdge(focalServiceId, 'auth-service'),
    mkEdge('order-service', 'payment-service'),
    mkEdge('order-service', 'inventory-service'),
    mkEdge('order-service', 'fulfillment-service'),
    mkEdge('user-service', 'profile-service'),
    mkEdge('user-service', 'session-service'),
    mkEdge('catalog-service', 'pricing-service'),
    mkEdge('catalog-service', 'recommendation-service'),
    mkEdge('search-service', '>elasticsearch'),
    mkEdge('cart-service', '>redis'),
    mkEdge('auth-service', '>redis'),
    mkEdge('payment-service', 'notification-service'),
    mkEdge('payment-service', 'billing-service'),
    mkEdge('payment-service', 'tax-service'),
    mkEdge('inventory-service', 'warehouse-service'),
    mkEdge('inventory-service', '>postgresql'),
    mkEdge('fulfillment-service', 'shipping-service'),
    mkEdge('fulfillment-service', 'returns-service'),
    mkEdge('notification-service', 'email-worker'),
    mkEdge('notification-service', '>kafka'),
    mkEdge('shipping-service', 'warehouse-service'),
    mkEdge('billing-service', '>postgresql'),
    mkEdge('analytics-service', '>elasticsearch'),
    mkEdge('audit-service', '>kafka'),
    mkEdge('recommendation-service', 'analytics-service'),
    mkEdge('session-service', '>redis'),
    mkEdge('profile-service', '>postgresql'),
  ];

  return { nodes, edges, focalServiceId };
}

/** @deprecated Use createRichContextualServiceMap */
export function createBranchingServiceMap(): ReturnType<typeof createRichContextualServiceMap> {
  return createRichContextualServiceMap();
}

const FAN_OUT_AGENT_NAMES: AgentName[] = [
  'java',
  'nodejs',
  'go',
  'python',
  'dotnet',
  'ruby',
  'php',
  'rum-js',
];

/**
 * Star topology: one focal service with many direct (1-hop) service neighbors.
 * Mimics dense production maps where a single service fans out to dozens of peers.
 */
export function createHighFanOutServiceMap(neighborCount = 48): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  focalServiceId: string;
} {
  const focalServiceId = 'product-page';

  const mkService = (
    id: string,
    agentName: AgentName,
    extra?: Partial<ServiceNodeData>
  ): ServiceMapNode => ({
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: true,
      agentName,
      ...extra,
    },
  });

  const mkEdge = (source: string, target: string): ServiceMapEdge =>
    ({
      id: `${source}~${target}`,
      source,
      target,
      data: {
        isBidirectional: false,
        sourceData: { id: source },
        targetData: { id: target },
      },
      type: 'default',
      style: { stroke: '#c8c8c8', strokeWidth: 1 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: '#c8c8c8',
      },
    } as ServiceMapEdge);

  const nodes: ServiceMapNode[] = [mkService(focalServiceId, 'rum-js', { alertsCount: 1 })];
  const edges: ServiceMapEdge[] = [];

  for (let i = 0; i < neighborCount; i++) {
    const neighborId = `downstream-${String(i + 1).padStart(2, '0')}`;
    const agentName = FAN_OUT_AGENT_NAMES[i % FAN_OUT_AGENT_NAMES.length];
    nodes.push(
      mkService(neighborId, agentName, {
        ...(i % 7 === 0 ? { alertsCount: 1 + (i % 4) } : {}),
        ...(i % 11 === 0 ? { sloStatus: 'degrading', sloCount: 1 } : {}),
      })
    );
    edges.push(mkEdge(focalServiceId, neighborId));
  }

  return { nodes, edges, focalServiceId };
}
