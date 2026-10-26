/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnections, toDisplayName } from './utils';
import type {
  Connection,
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from './types';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  AGENT_NAME,
} from '@kbn/apm-types';

function getConnectionsPairs(connections: Connection[]) {
  return connections
    .map((conn) => {
      const source = (conn.source as ServiceConnectionNode)[SERVICE_NAME];
      const destination =
        (conn.destination as ServiceConnectionNode)[SERVICE_NAME] ??
        (conn.destination as ExternalConnectionNode)[SPAN_TYPE];
      return `${source} -> ${destination}`;
    })
    .filter((_) => _);
}

describe('getConnections', () => {
  const paths = [
    [
      {
        [SERVICE_NAME]: 'opbeans-ruby',
        [AGENT_NAME]: 'ruby',
      },
      {
        [SERVICE_NAME]: 'opbeans-node',
        [AGENT_NAME]: 'nodejs',
      },
      {
        [SERVICE_NAME]: 'opbeans-go',
        [AGENT_NAME]: 'go',
      },
      {
        [SERVICE_NAME]: 'opbeans-java',
        [AGENT_NAME]: 'java',
      },
      {
        'span.subtype': 'http',
        'span.destination.service.resource': '172.18.0.6:3000',
        'span.type': 'external',
      },
    ],
    [
      {
        [SERVICE_NAME]: 'opbeans-ruby',
        [AGENT_NAME]: 'ruby',
      },
      {
        [SERVICE_NAME]: 'opbeans-python',
        [AGENT_NAME]: 'python',
      },
      {
        [SPAN_SUBTYPE]: 'http',
        [SPAN_DESTINATION_SERVICE_RESOURCE]: '172.18.0.6:3000',
        [SPAN_TYPE]: 'external',
      },
    ],
    [
      {
        [SERVICE_NAME]: 'opbeans-go',
        [AGENT_NAME]: 'go',
      },
      {
        [SERVICE_NAME]: 'opbeans-node',
        [AGENT_NAME]: 'nodejs',
      },
    ],
  ] as ConnectionNode[][];

  it('includes all connections', () => {
    const connections = getConnections(paths);

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

describe('toDisplayName', () => {
  it('strips leading ">" from dependency node id', () => {
    expect(toDisplayName('>postgresql')).toBe('postgresql');
    expect(toDisplayName('>redis')).toBe('redis');
  });

  it('returns id unchanged when it does not start with ">"', () => {
    expect(toDisplayName('opbeans-java')).toBe('opbeans-java');
    expect(toDisplayName('service-a')).toBe('service-a');
  });
});
