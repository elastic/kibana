/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType } from '@xyflow/react';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  ServiceNodeData,
  DependencyNodeData,
  GroupedNodeData,
} from '../../../../../common/service_map';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import type { ServiceAnomalyStats } from '../../../../../common/anomaly_detection';

const AGENT_NAMES: AgentName[] = [
  'dotnet',
  'go',
  'java',
  'rum-js',
  'js-base',
  'nodejs',
  'php',
  'python',
  'ruby',
  'iOS/swift',
  'android/java',
  'opentelemetry/java',
  'opentelemetry/nodejs',
  'opentelemetry/python',
];

const SERVICE_NAMES = [
  'api-gateway',
  'auth-service',
  'user-service',
  'order-service',
  'payment-service',
  'inventory-service',
  'notification-service',
  'analytics-service',
  'search-service',
  'recommendation-engine',
  'cart-service',
  'shipping-service',
  'frontend-app',
  'mobile-backend',
  'admin-dashboard',
];

const DEPENDENCY_TYPES = [
  { spanType: 'db', spanSubtype: 'postgresql', label: 'postgresql' },
  { spanType: 'db', spanSubtype: 'mysql', label: 'mysql' },
  { spanType: 'db', spanSubtype: 'mongodb', label: 'mongodb' },
  { spanType: 'db', spanSubtype: 'elasticsearch', label: 'elasticsearch' },
  { spanType: 'db', spanSubtype: 'redis', label: 'redis' },
  { spanType: 'messaging', spanSubtype: 'kafka', label: 'kafka' },
  { spanType: 'messaging', spanSubtype: 'rabbitmq', label: 'rabbitmq' },
  { spanType: 'external', spanSubtype: 'http', label: 'api.stripe.com' },
  { spanType: 'external', spanSubtype: 'http', label: 'api.sendgrid.com' },
  { spanType: 'external', spanSubtype: 'grpc', label: 'grpc-service' },
];

const HEALTH_STATUSES = [
  undefined,
  ServiceHealthStatus.healthy,
  ServiceHealthStatus.warning,
  ServiceHealthStatus.critical,
];

function range(n: number): number[] {
  return Array(n)
    .fill(0)
    .map((_, i) => i);
}

function randn(n: number): number {
  return Math.floor(Math.random() * n);
}

function probability(p: number): boolean {
  return Math.random() < p;
}

function getRandomAgent(): AgentName {
  return AGENT_NAMES[randn(AGENT_NAMES.length)];
}

function getRandomServiceName(index: number): string {
  return (
    SERVICE_NAMES[index % SERVICE_NAMES.length] + (index >= SERVICE_NAMES.length ? `-${index}` : '')
  );
}

function getRandomDependency(): (typeof DEPENDENCY_TYPES)[0] {
  return DEPENDENCY_TYPES[randn(DEPENDENCY_TYPES.length)];
}

function getRandomHealthStatus(): ServiceHealthStatus | undefined {
  return HEALTH_STATUSES[randn(HEALTH_STATUSES.length)];
}

function createAnomalyStats(
  healthStatus: ServiceHealthStatus | undefined
): ServiceAnomalyStats | undefined {
  if (!healthStatus) return undefined;

  let anomalyScore: number | undefined;
  switch (healthStatus) {
    case ServiceHealthStatus.healthy:
      anomalyScore = randn(25);
      break;
    case ServiceHealthStatus.warning:
      anomalyScore = 25 + randn(50);
      break;
    case ServiceHealthStatus.critical:
      anomalyScore = 75 + randn(25);
      break;
  }

  return {
    healthStatus,
    transactionType: 'request',
    anomalyScore,
    actualValue: Math.random() * 2000000,
    jobId: `job-${Date.now()}`,
  };
}

function createDefaultEdgeStyle(color: string = '#c8c8c8') {
  return {
    type: 'default' as const,
    style: {
      stroke: color,
      strokeWidth: 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color,
    },
  };
}

export interface GenerateOptions {
  serviceCount: number;
  dependencyCount: number;
  includeGroupedResources: boolean;
  groupedResourceCount: number;
  hasAnomalies: boolean;
  includeBidirectional: boolean;
}

export function generateServiceMapElements(options: GenerateOptions): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
} {
  const {
    serviceCount,
    dependencyCount,
    includeGroupedResources,
    groupedResourceCount,
    hasAnomalies,
    includeBidirectional,
  } = options;

  const nodes: ServiceMapNode[] = [];
  const edges: ServiceMapEdge[] = [];

  range(serviceCount).forEach((i) => {
    const id = getRandomServiceName(i);
    const healthStatus = hasAnomalies ? getRandomHealthStatus() : undefined;
    const data: ServiceNodeData = {
      id,
      label: id,
      isService: true,
      agentName: getRandomAgent(),
      serviceAnomalyStats: createAnomalyStats(healthStatus),
    };
    nodes.push({
      id,
      type: 'service',
      position: { x: 0, y: 0 },
      data,
    });
  });

  range(dependencyCount).forEach((i) => {
    const dep = getRandomDependency();
    const id = `>${dep.label}-${i}`;
    const data: DependencyNodeData = {
      id,
      label: dep.label,
      isService: false,
      spanType: dep.spanType,
      spanSubtype: dep.spanSubtype,
    };
    nodes.push({
      id,
      type: 'dependency',
      position: { x: 0, y: 0 },
      data,
    });
  });

  if (includeGroupedResources) {
    range(Math.min(groupedResourceCount, 3)).forEach((i) => {
      const dep = getRandomDependency();
      const count = 2 + randn(8);
      const id = `grouped-${dep.spanSubtype}-${i}`;
      const data: GroupedNodeData = {
        id,
        label: `${count} ${dep.label}s`,
        isService: false,
        isGrouped: true,
        spanType: dep.spanType,
        spanSubtype: dep.spanSubtype,
        count,
        groupedConnections: range(count).map((j) => ({
          id: `${dep.spanSubtype}-${i}-${j}`,
          label: `${dep.label}-${j}`,
          spanType: dep.spanType,
          spanSubtype: dep.spanSubtype,
        })),
      };
      nodes.push({
        id,
        type: 'groupedResources',
        position: { x: 0, y: 0 },
        data,
      });
    });
  }

  const serviceNodes = nodes.filter((n) => n.type === 'service');
  const targetNodes = nodes.filter((n) => n.type !== 'service');

  range(Math.round(serviceCount * 1.2)).forEach(() => {
    const source = serviceNodes[randn(serviceNodes.length)];
    const target = serviceNodes[randn(serviceNodes.length)];
    if (source && target && source.id !== target.id) {
      const edgeId = `${source.id}~${target.id}`;
      if (!edges.find((e) => e.id === edgeId)) {
        const isBidirectional = includeBidirectional && probability(0.2);
        edges.push({
          id: edgeId,
          source: source.id,
          target: target.id,
          data: {
            isBidirectional,
            sourceData: { id: source.id },
            targetData: { id: target.id },
          },
          ...(isBidirectional
            ? {
                ...createDefaultEdgeStyle(),
                markerStart: {
                  type: MarkerType.ArrowClosed,
                  width: 12,
                  height: 12,
                  color: '#c8c8c8',
                },
              }
            : createDefaultEdgeStyle()),
        } as ServiceMapEdge);
      }
    }
  });

  targetNodes.forEach((target) => {
    const source = serviceNodes[randn(serviceNodes.length)];
    if (source) {
      const edgeId = `${source.id}~${target.id}`;
      edges.push({
        id: edgeId,
        source: source.id,
        target: target.id,
        data: {
          isBidirectional: false,
          sourceData: { id: source.id },
          targetData: { id: target.id },
        },
        ...createDefaultEdgeStyle(),
      } as ServiceMapEdge);
    }
  });

  return { nodes, edges };
}

export function createSimpleServiceMap(): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  const nodes: ServiceMapNode[] = [
    {
      id: 'frontend',
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        id: 'frontend',
        label: 'frontend',
        isService: true,
        agentName: 'rum-js',
      },
    },
    {
      id: 'api-gateway',
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        id: 'api-gateway',
        label: 'api-gateway',
        isService: true,
        agentName: 'nodejs',
      },
    },
    {
      id: 'user-service',
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        id: 'user-service',
        label: 'user-service',
        isService: true,
        agentName: 'java',
        serviceAnomalyStats: {
          healthStatus: ServiceHealthStatus.healthy,
          transactionType: 'request',
        },
      },
    },
    {
      id: 'order-service',
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        id: 'order-service',
        label: 'order-service',
        isService: true,
        agentName: 'python',
        serviceAnomalyStats: {
          healthStatus: ServiceHealthStatus.warning,
          transactionType: 'request',
          anomalyScore: 55,
        },
      },
    },
    {
      id: '>postgresql',
      type: 'dependency',
      position: { x: 0, y: 0 },
      data: {
        id: '>postgresql',
        label: 'postgresql',
        isService: false,
        spanType: 'db',
        spanSubtype: 'postgresql',
      },
    },
    {
      id: '>redis',
      type: 'dependency',
      position: { x: 0, y: 0 },
      data: {
        id: '>redis',
        label: 'redis',
        isService: false,
        spanType: 'db',
        spanSubtype: 'redis',
      },
    },
  ];

  const edges: ServiceMapEdge[] = [
    {
      id: 'frontend~api-gateway',
      source: 'frontend',
      target: 'api-gateway',
      data: { isBidirectional: false },
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge,
    {
      id: 'api-gateway~user-service',
      source: 'api-gateway',
      target: 'user-service',
      data: { isBidirectional: false },
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge,
    {
      id: 'api-gateway~order-service',
      source: 'api-gateway',
      target: 'order-service',
      data: { isBidirectional: false },
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge,
    {
      id: 'user-service~>postgresql',
      source: 'user-service',
      target: '>postgresql',
      data: { isBidirectional: false },
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge,
    {
      id: 'order-service~>postgresql',
      source: 'order-service',
      target: '>postgresql',
      data: { isBidirectional: false },
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge,
    {
      id: 'api-gateway~>redis',
      source: 'api-gateway',
      target: '>redis',
      data: { isBidirectional: false },
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge,
  ];

  return { nodes, edges };
}

export function createMicroservicesExample(): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  return generateServiceMapElements({
    serviceCount: 12,
    dependencyCount: 4,
    includeGroupedResources: true,
    groupedResourceCount: 2,
    hasAnomalies: true,
    includeBidirectional: true,
  });
}

export function createLargeServiceMap(nodeCount: number = 100): {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
} {
  const serviceCount = Math.floor(nodeCount * 0.7);
  const dependencyCount = Math.floor(nodeCount * 0.2);
  const groupedCount = Math.floor(nodeCount * 0.1);

  return generateServiceMapElements({
    serviceCount,
    dependencyCount,
    includeGroupedResources: groupedCount > 0,
    groupedResourceCount: groupedCount,
    hasAnomalies: true,
    includeBidirectional: true,
  });
}
