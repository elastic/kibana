/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceHealthStatus } from '../service_health_status';
import { SPAN_SUBTYPE, SPAN_TYPE } from '../es_fields/apm';
import type {
  ServiceMapExitSpan,
  ServiceMapService,
  ServiceMapConnections,
  GroupResourceNodesResponse,
  ServiceConnectionNode,
} from './types';
import { getServiceMapNodes } from './get_service_map_nodes';
import { getExternalConnectionNode, getServiceConnectionNode } from './utils';

/**
 * Helper function to generate a service connection node.
 */
const createService = (service: { serviceName: string; agentName: string }) =>
  ({
    ...service,
    serviceEnvironment: 'production',
  } as ServiceMapService);

/**
 * Helper function to generate an external connection node.
 */
const createExitSpan = (exitSpan: {
  agentName?: string;
  serviceName?: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
}) =>
  ({
    ...exitSpan,
    serviceEnvironment: 'production',
  } as ServiceMapExitSpan);

const nodejsService = createService({ serviceName: 'opbeans-node', agentName: 'nodejs' });
const javaService = createService({ serviceName: 'opbeans-java', agentName: 'java' });
const goService = createService({ serviceName: 'opbeans-go', agentName: 'go' });
const pythonService = createService({ serviceName: 'opbeans-python', agentName: 'python' });

const kafkaExternal = createExitSpan({
  spanDestinationServiceResource: 'kafka/some-queue',
  spanType: 'messaging',
  spanSubtype: 'kafka',
});

const nodejsExternal = createExitSpan({
  spanDestinationServiceResource: 'opbeans-node',
  spanType: 'external',
  spanSubtype: 'aa',
});

const httpLoadBalancer = createExitSpan({
  spanDestinationServiceResource: 'opbeans:3000',
  spanType: 'external',
  spanSubtype: 'http',
});

const elasticSearchExternal = createExitSpan({
  spanDestinationServiceResource: 'elasticsearch',
  spanType: 'db',
  spanSubtype: 'elasticsearch',
});

// Helper to create a single service anomaly
const createServiceAnomaly = (
  serviceName: string,
  overrides: Partial<{
    anomalyScore: number;
    healthStatus: ServiceHealthStatus;
    actualValue: number;
  }> = {}
) => ({
  serviceName,
  transactionType: 'request',
  actualValue: overrides.actualValue ?? 10000,
  anomalyScore: overrides.anomalyScore ?? 50,
  jobId: 'apm-production-1234-apm_tx_metrics',
  healthStatus: overrides.healthStatus ?? ServiceHealthStatus.warning,
});

// Helper to create anomalies for one or more services
const createAnomalies = (
  ...serviceConfigs: Array<
    | string
    | {
        serviceName: string;
        anomalyScore?: number;
        healthStatus?: ServiceHealthStatus;
        actualValue?: number;
      }
  >
) => ({
  mlJobIds: ['apm-production-1234-apm_tx_metrics'],
  serviceAnomalies: serviceConfigs.map((config) =>
    typeof config === 'string'
      ? createServiceAnomaly(config)
      : createServiceAnomaly(config.serviceName, config)
  ),
});

// Default anomalies for tests that don't care about matching service names
const anomalies = createAnomalies('opbeans-test');

// Helper to get anomaly stats from a node
const getNodeAnomalyStats = (
  elements: GroupResourceNodesResponse['elements'],
  serviceId: string
) => {
  const node = elements.find((el) => el.data.id === serviceId);
  return (node?.data as ServiceConnectionNode)?.serviceAnomalyStats;
};

describe('getServiceMapNodes', () => {
  it('maps external destinations to internal services with anomalies', () => {
    const multiServiceAnomalies = createAnomalies(
      { serviceName: 'opbeans-node', anomalyScore: 75, healthStatus: ServiceHealthStatus.critical },
      { serviceName: 'opbeans-java', anomalyScore: 25, healthStatus: ServiceHealthStatus.healthy }
    );

    const response: ServiceMapConnections = {
      servicesData: [
        getServiceConnectionNode(nodejsService),
        getServiceConnectionNode(javaService),
      ],
      exitSpanDestinations: [
        {
          from: getExternalConnectionNode(nodejsExternal),
          to: getServiceConnectionNode(nodejsService),
        },
      ],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode(nodejsExternal),
        },
      ],
      anomalies: multiServiceAnomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { edges, nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual(['opbeans-java', 'opbeans-node']);
    expect(getIds(edges)).toEqual(['opbeans-java~opbeans-node']);

    // Verify anomalies are attached to each service node
    expect(getNodeAnomalyStats(elements, 'opbeans-node')).toEqual(
      multiServiceAnomalies.serviceAnomalies[0]
    );
    expect(getNodeAnomalyStats(elements, 'opbeans-java')).toEqual(
      multiServiceAnomalies.serviceAnomalies[1]
    );
  });

  it('adds connections for messaging systems', () => {
    const response: ServiceMapConnections = {
      servicesData: [
        getServiceConnectionNode(nodejsService),
        getServiceConnectionNode(javaService),
      ],
      exitSpanDestinations: [
        {
          from: getExternalConnectionNode({ ...kafkaExternal, ...javaService }),
          to: getServiceConnectionNode(nodejsService),
        },
        {
          from: getExternalConnectionNode({ ...kafkaExternal, ...javaService }),
          to: getServiceConnectionNode(goService),
        },
      ],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...kafkaExternal, ...javaService }),
        },
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...kafkaExternal, ...goService }),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { edges, nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual([
      '>kafka/some-queue',
      'opbeans-go',
      'opbeans-java',
      'opbeans-node',
    ]);
    expect(getIds(edges)).toEqual([
      '>kafka/some-queue~opbeans-go',
      '>kafka/some-queue~opbeans-node',
      'opbeans-java~>kafka/some-queue',
    ]);
  });

  it('collapses external destinations based on span.destination.resource.name', () => {
    const response: ServiceMapConnections = {
      servicesData: [
        getServiceConnectionNode(nodejsService),
        getServiceConnectionNode(javaService),
      ],
      exitSpanDestinations: [
        {
          from: getExternalConnectionNode({ ...nodejsExternal, ...javaService }),
          to: getServiceConnectionNode(nodejsService),
        },
        {
          from: getExternalConnectionNode({ ...nodejsExternal, ...goService }),
          to: getServiceConnectionNode(nodejsService),
        },
      ],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...nodejsExternal, ...javaService }),
        },
        {
          source: getServiceConnectionNode(goService),
          destination: getExternalConnectionNode({
            ...nodejsExternal,
            ...goService,
            spanType: 'foo',
          }),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { edges, nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual(['opbeans-go', 'opbeans-java', 'opbeans-node']);
    expect(getIds(edges)).toEqual(['opbeans-go~opbeans-node', 'opbeans-java~opbeans-node']);
  });

  it('collapses external destinations based on span.destination.resource.name for exit spans without downstream transactions', () => {
    const response: ServiceMapConnections = {
      servicesData: [],
      exitSpanDestinations: [],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...elasticSearchExternal, ...javaService }),
        },
        {
          source: getServiceConnectionNode(goService),
          destination: getExternalConnectionNode({
            ...elasticSearchExternal,
            ...goService,
            spanType: 'foo',
          }),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { edges, nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual(['>elasticsearch', 'opbeans-go', 'opbeans-java']);
    expect(getIds(edges)).toEqual(['opbeans-go~>elasticsearch', 'opbeans-java~>elasticsearch']);
  });

  it('picks the first span.type/subtype in an alphabetically sorted list', () => {
    const response: ServiceMapConnections = {
      servicesData: [getServiceConnectionNode(javaService)],
      exitSpanDestinations: [],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...nodejsExternal, ...javaService }),
        },

        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode(
            createExitSpan({ ...nodejsExternal, ...javaService, spanType: 'foo' })
          ),
        },
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({
            ...nodejsExternal,
            ...javaService,
            spanSubtype: 'bb',
          }),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { edges, nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual(['>opbeans-node', 'opbeans-java']);
    expect(getIds(edges)).toEqual(['opbeans-java~>opbeans-node']);

    const nodejsNode = elements.find((node) => node.data.id === '>opbeans-node');
    // @ts-expect-error
    expect(nodejsNode?.data[SPAN_TYPE]).toBe('external');
    // @ts-expect-error
    expect(nodejsNode?.data[SPAN_SUBTYPE]).toBe('aa');
  });

  it('processes connections without a matching "service" aggregation', () => {
    const response: ServiceMapConnections = {
      servicesData: [getServiceConnectionNode(javaService)],
      exitSpanDestinations: [],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getServiceConnectionNode(nodejsService),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);
    expect(elements.length).toBe(3);
  });

  it('returns serviceAnomalies for a single service', () => {
    const nodejsAnomalies = createAnomalies({
      serviceName: 'opbeans-node',
      anomalyScore: 75,
      healthStatus: ServiceHealthStatus.critical,
    });

    const response: ServiceMapConnections = {
      servicesData: [getServiceConnectionNode(nodejsService)],
      exitSpanDestinations: [],
      connections: [],
      anomalies: nodejsAnomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { nodes } = partitionElements(elements);

    expect(nodes).toHaveLength(1);
    expect(getIds(nodes)).toEqual(['opbeans-node']);

    // Verify the service node contains the anomaly data
    expect(getNodeAnomalyStats(elements, 'opbeans-node')).toEqual(
      nodejsAnomalies.serviceAnomalies[0]
    );
  });

  it('does not attach anomaly stats to external nodes', () => {
    const javaAnomalies = createAnomalies({
      serviceName: 'opbeans-java',
      anomalyScore: 75,
      healthStatus: ServiceHealthStatus.critical,
    });

    const response: ServiceMapConnections = {
      servicesData: [getServiceConnectionNode(javaService)],
      exitSpanDestinations: [],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...elasticSearchExternal, ...javaService }),
        },
      ],
      anomalies: javaAnomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual(['>elasticsearch', 'opbeans-java']);

    // Service node should have anomaly stats
    expect(getNodeAnomalyStats(elements, 'opbeans-java')?.anomalyScore).toBe(75);

    // External node should NOT have anomaly stats
    expect(getNodeAnomalyStats(elements, '>elasticsearch')).toBeUndefined();
  });

  it('should return connections and anomalies when exit spans point to a load balancer', () => {
    const loadBalancerAnomalies = createAnomalies(
      { serviceName: 'opbeans-java', anomalyScore: 80, healthStatus: ServiceHealthStatus.critical },
      { serviceName: 'opbeans-go', anomalyScore: 50, healthStatus: ServiceHealthStatus.warning },
      { serviceName: 'opbeans-node', anomalyScore: 10, healthStatus: ServiceHealthStatus.healthy },
      { serviceName: 'opbeans-python', anomalyScore: 60, healthStatus: ServiceHealthStatus.warning }
    );

    const response: ServiceMapConnections = {
      servicesData: [getServiceConnectionNode(javaService)],
      exitSpanDestinations: [
        {
          from: getExternalConnectionNode({ ...httpLoadBalancer, ...javaService }),
          to: getServiceConnectionNode(nodejsService),
        },
        {
          from: getExternalConnectionNode({ ...httpLoadBalancer, ...goService }),
          to: getServiceConnectionNode(javaService),
        },
        {
          from: getExternalConnectionNode({ ...httpLoadBalancer, ...pythonService }),
          to: getServiceConnectionNode(javaService),
        },
      ],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...httpLoadBalancer, ...javaService }),
        },
        {
          source: getServiceConnectionNode(goService),
          destination: getExternalConnectionNode({ ...httpLoadBalancer, ...goService }),
        },
        {
          source: getServiceConnectionNode(pythonService),
          destination: getExternalConnectionNode({ ...httpLoadBalancer, ...pythonService }),
        },
      ],
      anomalies: loadBalancerAnomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const { edges, nodes } = partitionElements(elements);

    expect(getIds(nodes)).toEqual(['opbeans-go', 'opbeans-java', 'opbeans-node', 'opbeans-python']);
    expect(getIds(edges)).toEqual([
      'opbeans-go~opbeans-java',
      'opbeans-java~opbeans-node',
      'opbeans-python~opbeans-java',
    ]);

    // Verify anomalies are correctly attached to all services
    expect(getNodeAnomalyStats(elements, 'opbeans-java')?.anomalyScore).toBe(80);
    expect(getNodeAnomalyStats(elements, 'opbeans-java')?.healthStatus).toBe(
      ServiceHealthStatus.critical
    );
    expect(getNodeAnomalyStats(elements, 'opbeans-go')?.anomalyScore).toBe(50);
    expect(getNodeAnomalyStats(elements, 'opbeans-node')?.anomalyScore).toBe(10);
    expect(getNodeAnomalyStats(elements, 'opbeans-python')?.anomalyScore).toBe(60);
  });
});

type ConnectionElements = GroupResourceNodesResponse['elements'];

export function partitionElements(elements: ConnectionElements) {
  const edges = elements.filter(({ data }) => 'source' in data && 'target' in data);
  const nodes = elements.filter((element) => !edges.includes(element));
  return { edges, nodes };
}

export function getIds(elements: ConnectionElements) {
  return elements.map(({ data }) => data.id).sort();
}
