/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnections } from './get_service_map_from_trace_ids';
import { Connection, ConnectionNode } from '../../../common/service_map';

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

    it('includes all connections', () => {
      const connections = getConnections({
        paths,
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

  describe('environment is "not defined"', () => {
    it('includes all connections', () => {
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
      });

      const connectionsPairs = getConnectionsPairs(connections);
      expect(connectionsPairs).toEqual([
        'opbeans-go:production -> opbeans-java:production',
        'opbeans-java:production -> external',
        'opbeans-go:null -> opbeans-java:null',
        'opbeans-java:null -> external',
        'opbeans-python:null -> opbeans-node:null',
        'opbeans-node:null -> external',
      ]);
    });
  });
});
