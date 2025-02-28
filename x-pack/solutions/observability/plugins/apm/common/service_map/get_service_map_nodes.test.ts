/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceHealthStatus } from '../service_health_status';
import { SERVICE_NAME, SPAN_SUBTYPE, SPAN_TYPE } from '../es_fields/apm';
import type { ServiceMapExitSpan, ServiceMapService, ServiceMapConnections } from './types';
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

// Define anomalies
const anomalies = {
  mlJobIds: ['apm-test-1234-ml-module-name'],
  serviceAnomalies: [
    {
      serviceName: 'opbeans-test',
      transactionType: 'request',
      actualValue: 10000,
      anomalyScore: 50,
      jobId: 'apm-test-1234-ml-module-name',
      healthStatus: ServiceHealthStatus.warning,
    },
  ],
};

describe('getServiceMapNodes', () => {
  it('maps external destinations to internal services', () => {
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
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    const connection = elements.find((e) => 'source' in e.data && 'target' in e.data);

    expect(connection).toMatchObject({
      data: { target: 'opbeans-node' },
    });

    expect(elements.some((e) => e.data.id === '>opbeans-node')).toBe(false);
  });

  it('adds connection for messaging-based external destinations', () => {
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
      ],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...kafkaExternal, ...javaService }),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    expect(elements.length).toBe(5);

    const connections = elements.filter(
      (element) => 'source' in element.data && 'target' in element.data
    );
    expect(connections.length).toBe(2);

    const sendMessageConnection = connections.find(
      (element) => 'source' in element.data && element.data.source === 'opbeans-java'
    );

    expect(sendMessageConnection).toHaveProperty('data');
    expect(sendMessageConnection?.data).toHaveProperty('target');

    if (sendMessageConnection?.data && 'target' in sendMessageConnection.data) {
      expect(sendMessageConnection.data.target).toBe('>opbeans-java|kafka/some-queue');
      expect(sendMessageConnection.data.id).toBe('opbeans-java~>opbeans-java|kafka/some-queue');
    }

    const receiveMessageConnection = connections.find(
      (element) => 'target' in element.data && element.data.target === 'opbeans-node'
    );

    expect(receiveMessageConnection).toHaveProperty('data');
    expect(receiveMessageConnection?.data).toHaveProperty('target');

    if (receiveMessageConnection?.data && 'source' in receiveMessageConnection.data) {
      expect(receiveMessageConnection.data.source).toBe('>opbeans-java|kafka/some-queue');
      expect(receiveMessageConnection.data.id).toBe('>opbeans-java|kafka/some-queue~opbeans-node');
    }
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
      ],
      connections: [
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({ ...nodejsExternal, ...javaService }),
        },
        {
          source: getServiceConnectionNode(javaService),
          destination: getExternalConnectionNode({
            ...nodejsExternal,
            ...javaService,
            spanType: 'foo',
          }),
        },
      ],
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    expect(elements.filter((element) => 'source' in element.data).length).toBe(1);
    expect(elements.filter((element) => !('source' in element.data)).length).toBe(2);
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

    const nodejsNode = elements.find((node) => node.data.id === '>opbeans-java|opbeans-node');

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

  it('maps routing services child transasctions to their corresponding upstream service', () => {
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
      anomalies,
    };

    const { elements } = getServiceMapNodes(response);

    expect(elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ [SERVICE_NAME]: 'opbeans-java' }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({ [SERVICE_NAME]: 'opbeans-node' }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({ [SERVICE_NAME]: 'opbeans-go' }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({ [SERVICE_NAME]: 'opbeans-python' }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({ source: 'opbeans-go', target: 'opbeans-java' }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({ source: 'opbeans-java', target: 'opbeans-node' }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({ source: 'opbeans-python', target: 'opbeans-java' }),
        }),
      ])
    );
  });
});
