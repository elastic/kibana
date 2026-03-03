/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STROKE_WIDTH,
  DEFAULT_MARKER_SIZE,
} from '../../../../../../common/service_map/constants';
import { ServiceNode } from '../../service_node';
import { DependencyNode } from '../../dependency_node';
import { ServiceMapEdge as ServiceMapEdgeComponent } from '../../service_map_edge';
import { ServiceMapEdgeWithLabel } from './service_map_edge_with_label';
import { ServiceNodeWithAlertAndSloBadges } from './service_node_with_alert_and_slo_badges';
import type { NodeTypes } from '@xyflow/react';
import type { EdgeTypes } from '@xyflow/react';

const DANGER_COLOR = '#BD271E';

export const PROBLEM_PATH_NODE_IDS = new Set([
  'payment-service',
  'order-service',
  'inventory-service',
  'postgresql',
]);

export const PROBLEM_PATH_EDGE_IDS = new Set([
  'payment-service~order-service',
  'order-service~inventory-service',
  'inventory-service~postgresql',
]);

export const MOCK_ALERTS_BY_SERVICE: Record<
  string,
  Array<{ id: string; title: string; severity: string; time: string }>
> = {
  'payment-service': [
    { id: '1', title: 'High error rate', severity: 'critical', time: '2024-01-15T10:32:00Z' },
    { id: '2', title: 'Latency threshold exceeded', severity: 'warning', time: '2024-01-15T10:28:00Z' },
    { id: '3', title: 'Connection timeouts', severity: 'critical', time: '2024-01-15T10:25:00Z' },
    { id: '4', title: 'Database pool exhausted', severity: 'critical', time: '2024-01-15T10:20:00Z' },
    { id: '5', title: 'Elevated 5xx rate', severity: 'warning', time: '2024-01-15T10:15:00Z' },
  ],
  'order-service': [
    { id: '6', title: 'Downstream timeout', severity: 'critical', time: '2024-01-15T10:30:00Z' },
    { id: '7', title: 'High memory', severity: 'warning', time: '2024-01-15T10:28:00Z' },
    { id: '8', title: 'Slow queries', severity: 'warning', time: '2024-01-15T10:26:00Z' },
  ],
  'inventory-service': [
    { id: '9', title: 'DB connection failures', severity: 'critical', time: '2024-01-15T10:29:00Z' },
    { id: '10', title: 'Cache miss spike', severity: 'warning', time: '2024-01-15T10:27:00Z' },
  ],
  'api-gateway': [
    { id: '12', title: 'Rate limit exceeded', severity: 'critical', time: '2024-01-15T10:30:00Z' },
    { id: '13', title: 'Upstream 502', severity: 'critical', time: '2024-01-15T10:28:00Z' },
    { id: '14', title: 'Certificate expiry', severity: 'warning', time: '2024-01-15T10:25:00Z' },
    { id: '15', title: 'High CPU', severity: 'warning', time: '2024-01-15T10:22:00Z' },
  ],
  'frontend-app': [
    { id: '16', title: 'CDN errors', severity: 'warning', time: '2024-01-15T10:29:00Z' },
    { id: '17', title: 'API latency', severity: 'warning', time: '2024-01-15T10:27:00Z' },
  ],
  'search-service': [
    { id: '19', title: 'Index lag', severity: 'critical', time: '2024-01-15T10:30:00Z' },
    { id: '20', title: 'Query timeout', severity: 'warning', time: '2024-01-15T10:28:00Z' },
    { id: '21', title: 'Cluster yellow', severity: 'warning', time: '2024-01-15T10:25:00Z' },
  ],
  'analytics-service': [
    { id: '22', title: 'Pipeline delay', severity: 'warning', time: '2024-01-15T10:29:00Z' },
    { id: '23', title: 'Schema mismatch', severity: 'warning', time: '2024-01-15T10:27:00Z' },
  ],
};

export const MOCK_FAILED_REQUESTS: Record<
  string,
  Array<{ time: string; errorMessage: string; requestId: string }>
> = {
  'payment-service~order-service': [
    { time: '2024-01-15T10:31:22Z', errorMessage: 'Connection refused', requestId: 'req-a1' },
    { time: '2024-01-15T10:30:45Z', errorMessage: 'Timeout after 5000ms', requestId: 'req-a2' },
    { time: '2024-01-15T10:29:11Z', errorMessage: '503 Service Unavailable', requestId: 'req-a3' },
  ],
  'order-service~inventory-service': [
    { time: '2024-01-15T10:30:12Z', errorMessage: 'Connection reset by peer', requestId: 'req-b1' },
    { time: '2024-01-15T10:28:33Z', errorMessage: 'Timeout after 5000ms', requestId: 'req-b2' },
  ],
  'inventory-service~postgresql': [
    { time: '2024-01-15T10:29:55Z', errorMessage: 'Connection pool exhausted', requestId: 'req-c1' },
    { time: '2024-01-15T10:27:00Z', errorMessage: 'Deadlock detected', requestId: 'req-c2' },
  ],
};

export function createDefaultEdgeStyle(color: string = DEFAULT_EDGE_COLOR) {
  return {
    type: 'default' as const,
    style: { stroke: color, strokeWidth: DEFAULT_EDGE_STROKE_WIDTH },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color,
    },
  };
}

export function createProblemEdgeStyle(
  failedCount: number,
  isDependencyEdge: boolean = false,
  showLabel: boolean = true
) {
  const noun = isDependencyEdge ? 'connection' : 'request';
  const label =
    showLabel && failedCount > 0
      ? `${failedCount} failed ${noun}${failedCount === 1 ? '' : 's'}`
      : '';
  return {
    type: 'withLabel' as const,
    style: { stroke: DANGER_COLOR, strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: DEFAULT_MARKER_SIZE,
      height: DEFAULT_MARKER_SIZE,
      color: DANGER_COLOR,
    },
    data: {
      label,
      isDanger: true,
      isDashed: true,
      isBidirectional: false,
    },
  };
}

export const nodeTypes: NodeTypes = {
  service: ServiceNode,
  dependency: DependencyNode,
  serviceWithAlertAndSlo: ServiceNodeWithAlertAndSloBadges,
};

export const edgeTypes: EdgeTypes = {
  default: ServiceMapEdgeComponent,
  withLabel: ServiceMapEdgeWithLabel,
};

export const BASE_NODES: Node[] = [
  {
    id: 'payment-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'payment-service',
      label: 'payment-service',
      isService: true,
      agentName: 'go',
      transactionName: 'POST /api/payment',
      alertCount: 5,
      sloCount: 2,
    },
  },
  {
    id: 'order-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'order-service',
      label: 'order-service',
      isService: true,
      agentName: 'python',
      transactionName: 'POST /api/orders',
      alertCount: 3,
      sloCount: 1,
    },
  },
  {
    id: 'inventory-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'inventory-service',
      label: 'inventory-service',
      isService: true,
      agentName: 'java',
      transactionName: 'GET /api/inventory',
      alertCount: 2,
      sloCount: 1,
    },
  },
  {
    id: 'postgresql',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'postgresql',
      label: 'postgresql',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
      transactionName: 'SELECT * FROM orders',
    },
  },
  {
    id: 'user-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'user-service',
      label: 'user-service',
      isService: true,
      agentName: 'nodejs',
      transactionName: 'GET /api/user',
      alertCount: 1,
      sloCount: 3,
    },
  },
  {
    id: 'api-gateway',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'api-gateway',
      label: 'api-gateway',
      isService: true,
      agentName: 'dotnet',
      transactionName: 'GET /api/gateway',
      alertCount: 4,
      sloCount: 2,
    },
  },
  {
    id: 'frontend-app',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'frontend-app',
      label: 'frontend-app',
      isService: true,
      agentName: 'rum-js',
      transactionName: 'GET /',
      alertCount: 2,
      sloCount: 4,
    },
  },
  {
    id: 'auth-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'auth-service',
      label: 'auth-service',
      isService: true,
      agentName: 'go',
      transactionName: 'POST /api/auth',
      sloCount: 2,
    },
  },
  {
    id: 'recommendation-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'recommendation-service',
      label: 'recommendation-service',
      isService: true,
      agentName: 'python',
      transactionName: 'GET /api/recommendations',
      alertCount: 1,
      sloCount: 1,
    },
  },
  {
    id: 'search-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'search-service',
      label: 'search-service',
      isService: true,
      agentName: 'java',
      transactionName: 'GET /api/search',
      alertCount: 3,
      sloCount: 2,
    },
  },
  {
    id: 'notification-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'notification-service',
      label: 'notification-service',
      isService: true,
      agentName: 'nodejs',
      transactionName: 'POST /api/notify',
      sloCount: 3,
    },
  },
  {
    id: 'analytics-service',
    type: 'serviceWithAlertAndSlo',
    position: { x: 0, y: 0 },
    data: {
      id: 'analytics-service',
      label: 'analytics-service',
      isService: true,
      agentName: 'python',
      transactionName: 'GET /api/analytics',
      alertCount: 2,
    },
  },
  {
    id: 'redis',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'redis',
      label: 'redis',
      isService: false,
      spanType: 'cache',
      spanSubtype: 'redis',
      transactionName: 'Redis GET',
    },
  },
  {
    id: 'elasticsearch',
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id: 'elasticsearch',
      label: 'elasticsearch',
      isService: false,
      spanType: 'db',
      spanSubtype: 'elasticsearch',
      transactionName: 'Elasticsearch search',
    },
  },
];

export const BASE_EDGES: Edge[] = [
  { id: 'payment-service~order-service', source: 'payment-service', target: 'order-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'order-service~inventory-service', source: 'order-service', target: 'inventory-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'inventory-service~postgresql', source: 'inventory-service', target: 'postgresql', data: {}, ...createDefaultEdgeStyle() },
  { id: 'payment-service~user-service', source: 'payment-service', target: 'user-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'payment-service~api-gateway', source: 'payment-service', target: 'api-gateway', data: {}, ...createDefaultEdgeStyle() },
  { id: 'api-gateway~frontend-app', source: 'api-gateway', target: 'frontend-app', data: {}, ...createDefaultEdgeStyle() },
  { id: 'api-gateway~auth-service', source: 'api-gateway', target: 'auth-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'user-service~recommendation-service', source: 'user-service', target: 'recommendation-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'user-service~redis', source: 'user-service', target: 'redis', data: {}, ...createDefaultEdgeStyle() },
  { id: 'frontend-app~search-service', source: 'frontend-app', target: 'search-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'search-service~elasticsearch', source: 'search-service', target: 'elasticsearch', data: {}, ...createDefaultEdgeStyle() },
  { id: 'order-service~notification-service', source: 'order-service', target: 'notification-service', data: {}, ...createDefaultEdgeStyle() },
  { id: 'inventory-service~analytics-service', source: 'inventory-service', target: 'analytics-service', data: {}, ...createDefaultEdgeStyle() },
];

export const NODE_IDS_WITH_ALERTS = new Set(
  BASE_NODES.filter((n) => {
    if (n.type !== 'serviceWithAlertAndSlo') return false;
    return ((n.data as { alertCount?: number }).alertCount ?? 0) > 0;
  }).map((n) => n.id)
);

export const NODE_IDS_WITH_SLOS = new Set(
  BASE_NODES.filter((n) => {
    if (n.type !== 'serviceWithAlertAndSlo') return false;
    return ((n.data as { sloCount?: number }).sloCount ?? 0) > 0;
  }).map((n) => n.id)
);

export const BADGE_NODE_IDS = new Set(
  BASE_NODES.filter((n) => {
    if (n.type !== 'serviceWithAlertAndSlo') return false;
    const d = n.data as { alertCount?: number; sloCount?: number };
    return (d.alertCount ?? 0) > 0 || (d.sloCount ?? 0) > 0;
  }).map((n) => n.id)
);
