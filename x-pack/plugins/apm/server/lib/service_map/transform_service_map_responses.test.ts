/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceHealthStatus } from '../../../common/service_health_status';

import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  transformServiceMapResponses,
  ServiceMapResponse,
} from './transform_service_map_responses';

const nodejsService = {
  [SERVICE_NAME]: 'opbeans-node',
  [SERVICE_ENVIRONMENT]: 'production',
  [AGENT_NAME]: 'nodejs',
};

const nodejsExternal = {
  [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans-node',
  [SPAN_TYPE]: 'external',
  [SPAN_SUBTYPE]: 'aa',
};

const javaService = {
  [SERVICE_NAME]: 'opbeans-java',
  [SERVICE_ENVIRONMENT]: 'production',
  [AGENT_NAME]: 'java',
};

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

describe('transformServiceMapResponses', () => {
  it('maps external destinations to internal services', () => {
    const response: ServiceMapResponse = {
      services: [nodejsService, javaService],
      discoveredServices: [
        {
          from: nodejsExternal,
          to: nodejsService,
        },
      ],
      connections: [
        {
          source: javaService,
          destination: nodejsExternal,
        },
      ],
      anomalies,
    };

    const { elements } = transformServiceMapResponses(response);

    const connection = elements.find(
      (element) => 'source' in element.data && 'target' in element.data
    );

    expect(connection).toHaveProperty('data');
    expect(connection?.data).toHaveProperty('target');
    if (connection?.data && 'target' in connection.data) {
      expect(connection.data.target).toBe('opbeans-node');
    }

    expect(
      elements.find((element) => element.data.id === '>opbeans-node')
    ).toBeUndefined();
  });

  it('collapses external destinations based on span.destination.resource.name', () => {
    const response: ServiceMapResponse = {
      services: [nodejsService, javaService],
      discoveredServices: [
        {
          from: nodejsExternal,
          to: nodejsService,
        },
      ],
      connections: [
        {
          source: javaService,
          destination: nodejsExternal,
        },
        {
          source: javaService,
          destination: {
            ...nodejsExternal,
            [SPAN_TYPE]: 'foo',
          },
        },
      ],
      anomalies,
    };

    const { elements } = transformServiceMapResponses(response);

    const connections = elements.filter((element) => 'source' in element.data);

    expect(connections.length).toBe(1);

    const nodes = elements.filter((element) => !('source' in element.data));

    expect(nodes.length).toBe(2);
  });

  it('picks the first span.type/subtype in an alphabetically sorted list', () => {
    const response: ServiceMapResponse = {
      services: [javaService],
      discoveredServices: [],
      connections: [
        {
          source: javaService,
          destination: nodejsExternal,
        },
        {
          source: javaService,
          destination: {
            ...nodejsExternal,
            [SPAN_TYPE]: 'foo',
          },
        },
        {
          source: javaService,
          destination: {
            ...nodejsExternal,
            [SPAN_SUBTYPE]: 'bb',
          },
        },
      ],
      anomalies,
    };

    const { elements } = transformServiceMapResponses(response);

    const nodes = elements.filter((element) => !('source' in element.data));

    const nodejsNode = nodes.find((node) => node.data.id === '>opbeans-node');

    // @ts-expect-error
    expect(nodejsNode?.data[SPAN_TYPE]).toBe('external');
    // @ts-expect-error
    expect(nodejsNode?.data[SPAN_SUBTYPE]).toBe('aa');
  });

  it('processes connections without a matching "service" aggregation', () => {
    const response: ServiceMapResponse = {
      services: [javaService],
      discoveredServices: [],
      connections: [
        {
          source: javaService,
          destination: nodejsService,
        },
      ],
      anomalies,
    };

    const { elements } = transformServiceMapResponses(response);

    expect(elements.length).toBe(3);
  });
});
