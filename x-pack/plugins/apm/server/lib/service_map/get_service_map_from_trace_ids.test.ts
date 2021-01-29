/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getConnections } from './get_service_map_from_trace_ids';
import { Connection, ConnectionNode } from '../../../common/service_map';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';

function getConnectionsPairs(connections: Connection[]) {
  return connections
    .map((conn) => {
      const source = `${conn.source['service.name']}:${conn.source['service.environment']}`;
      const destination = conn.destination['service.name']
        ? `${conn.destination['service.name']}:${conn.destination['service.environment']}`
        : conn.destination['span.type'];
      return `${source} -> ${destination}`;
    })
    .filter((_) => _);
}

describe('getConnections', () => {
  describe('with environments defined', () => {
    const paths = [
      [
        {
          'service.environment': 'testing',
          'service.name': 'opbeans-ruby',
          'agent.name': 'ruby',
        },
        {
          'service.environment': null,
          'service.name': 'opbeans-node',
          'agent.name': 'nodejs',
        },
        {
          'service.environment': 'production',
          'service.name': 'opbeans-go',
          'agent.name': 'go',
        },
        {
          'service.environment': 'production',
          'service.name': 'opbeans-java',
          'agent.name': 'java',
        },
        {
          'span.subtype': 'http',
          'span.destination.service.resource': '172.18.0.6:3000',
          'span.type': 'external',
        },
      ],
      [
        {
          'service.environment': 'testing',
          'service.name': 'opbeans-ruby',
          'agent.name': 'ruby',
        },
        {
          'service.environment': 'testing',
          'service.name': 'opbeans-python',
          'agent.name': 'python',
        },
        {
          'span.subtype': 'http',
          'span.destination.service.resource': '172.18.0.6:3000',
          'span.type': 'external',
        },
      ],
    ] as ConnectionNode[][];
    describe('if neither service name or environment is given', () => {
      it('includes all connections', () => {
        const connections = getConnections({
          paths,
          serviceName: undefined,
          environment: undefined,
        });

        const connectionsPairs = getConnectionsPairs(connections);
        expect(connectionsPairs).toEqual([
          'opbeans-ruby:testing -> opbeans-node:null',
          'opbeans-node:null -> opbeans-go:production',
          'opbeans-go:production -> opbeans-java:production',
          'opbeans-java:production -> external',
          'opbeans-ruby:testing -> opbeans-python:testing',
          'opbeans-python:testing -> external',
        ]);
      });
    });

    describe('if service name and environment are given', () => {
      it('shows all connections for opbeans-java and production', () => {
        const connections = getConnections({
          paths,
          serviceName: 'opbeans-java',
          environment: 'production',
        });

        const connectionsPairs = getConnectionsPairs(connections);

        expect(connectionsPairs).toEqual([
          'opbeans-ruby:testing -> opbeans-node:null',
          'opbeans-node:null -> opbeans-go:production',
          'opbeans-go:production -> opbeans-java:production',
          'opbeans-java:production -> external',
        ]);
      });

      it('shows all connections for opbeans-python and testing', () => {
        const connections = getConnections({
          paths,
          serviceName: 'opbeans-python',
          environment: 'testing',
        });

        const connectionsPairs = getConnectionsPairs(connections);

        expect(connectionsPairs).toEqual([
          'opbeans-ruby:testing -> opbeans-python:testing',
          'opbeans-python:testing -> external',
        ]);
      });
    });

    describe('if service name is given', () => {
      it('shows all connections for opbeans-node', () => {
        const connections = getConnections({
          paths,
          serviceName: 'opbeans-node',
          environment: undefined,
        });

        const connectionsPairs = getConnectionsPairs(connections);

        expect(connectionsPairs).toEqual([
          'opbeans-ruby:testing -> opbeans-node:null',
          'opbeans-node:null -> opbeans-go:production',
          'opbeans-go:production -> opbeans-java:production',
          'opbeans-java:production -> external',
        ]);
      });
    });

    describe('if environment is given', () => {
      it('shows all connections for testing environment', () => {
        const connections = getConnections({
          paths,
          serviceName: undefined,
          environment: 'testing',
        });

        const connectionsPairs = getConnectionsPairs(connections);

        expect(connectionsPairs).toEqual([
          'opbeans-ruby:testing -> opbeans-node:null',
          'opbeans-node:null -> opbeans-go:production',
          'opbeans-go:production -> opbeans-java:production',
          'opbeans-java:production -> external',
          'opbeans-ruby:testing -> opbeans-python:testing',
          'opbeans-python:testing -> external',
        ]);
      });
      it('shows all connections for production environment', () => {
        const connections = getConnections({
          paths,
          serviceName: undefined,
          environment: 'production',
        });

        const connectionsPairs = getConnectionsPairs(connections);

        expect(connectionsPairs).toEqual([
          'opbeans-ruby:testing -> opbeans-node:null',
          'opbeans-node:null -> opbeans-go:production',
          'opbeans-go:production -> opbeans-java:production',
          'opbeans-java:production -> external',
        ]);
      });
    });
  });

  describe('environment is "not defined"', () => {
    it('shows all connections where environment is not set', () => {
      const environmentNotDefinedPaths = [
        [
          {
            'service.environment': 'production',
            'service.name': 'opbeans-go',
            'agent.name': 'go',
          },
          {
            'service.environment': 'production',
            'service.name': 'opbeans-java',
            'agent.name': 'java',
          },
          {
            'span.subtype': 'http',
            'span.destination.service.resource': '172.18.0.6:3000',
            'span.type': 'external',
          },
        ],
        [
          {
            'service.environment': null,
            'service.name': 'opbeans-go',
            'agent.name': 'go',
          },
          {
            'service.environment': null,
            'service.name': 'opbeans-java',
            'agent.name': 'java',
          },
          {
            'span.subtype': 'http',
            'span.destination.service.resource': '172.18.0.6:3000',
            'span.type': 'external',
          },
        ],
        [
          {
            'service.environment': null,
            'service.name': 'opbeans-python',
            'agent.name': 'python',
          },
          {
            'service.environment': null,
            'service.name': 'opbeans-node',
            'agent.name': 'nodejs',
          },
          {
            'span.subtype': 'http',
            'span.destination.service.resource': '172.18.0.6:3000',
            'span.type': 'external',
          },
        ],
      ] as ConnectionNode[][];
      const connections = getConnections({
        paths: environmentNotDefinedPaths,
        serviceName: undefined,
        environment: ENVIRONMENT_NOT_DEFINED.value,
      });

      const connectionsPairs = getConnectionsPairs(connections);
      expect(connectionsPairs).toEqual([
        'opbeans-go:null -> opbeans-java:null',
        'opbeans-java:null -> external',
        'opbeans-python:null -> opbeans-node:null',
        'opbeans-node:null -> external',
      ]);
    });
  });
});
