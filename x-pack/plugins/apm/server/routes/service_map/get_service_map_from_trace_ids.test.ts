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
      const source = conn.source['service.name'];
      const destination = conn.destination['service.name']
        ? conn.destination['service.name']
        : conn.destination['span.type'];
      return `${source} -> ${destination}`;
    })
    .filter((_) => _);
}

describe('getConnections', () => {
  const paths = [
    [
      {
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
      },
      {
        'service.name': 'opbeans-node',
        'agent.name': 'nodejs',
      },
      {
        'service.name': 'opbeans-go',
        'agent.name': 'go',
      },
      {
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
        'service.name': 'opbeans-ruby',
        'agent.name': 'ruby',
      },
      {
        'service.name': 'opbeans-python',
        'agent.name': 'python',
      },
      {
        'span.subtype': 'http',
        'span.destination.service.resource': '172.18.0.6:3000',
        'span.type': 'external',
      },
    ],
    [
      {
        'service.name': 'opbeans-go',
        'agent.name': 'go',
      },
      {
        'service.name': 'opbeans-node',
        'agent.name': 'nodejs',
      },
    ],
  ] as ConnectionNode[][];

  it('includes all connections', () => {
    const connections = getConnections({
      paths,
    });

    const connectionsPairs = getConnectionsPairs(connections);
    expect(connectionsPairs).toEqual([
      'opbeans-ruby -> opbeans-node',
      'opbeans-node -> opbeans-go',
      'opbeans-go -> opbeans-java',
      'opbeans-java -> external',
      'opbeans-ruby -> opbeans-python',
      'opbeans-python -> external',
      'opbeans-go -> opbeans-node',
    ]);
  });
});
