/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, partition, uniqBy } from 'lodash';
import {
  Connection,
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ConnectionStats,
} from '../../../../common/service_map';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { calculateThroughput } from '../../helpers/calculate_throughput';
import {
  SpanConnectionsResponse,
  TransactionConnectionsResponse,
} from './fetch_connections_experimental';

interface Edge {
  next?: Edge;
  stats: ConnectionStats;
  caller: ConnectionResponse;
  callees: ConnectionResponse[];
}

interface ConnectionResponse {
  'transaction.upstream.hash': string | null;
  'span.destination.service.hash': string | null;
  'service.name': string;
  'service.environment': string | null;
  'agent.name': string;
  'span.type': string | null;
  'span.subtype': string | null;
  'span.destination.service.resource': string | null;
  stats?: ConnectionStats;
}

export function transformConnectionsExperimental({
  serviceName,
  environment,
  start,
  end,
  spanConnectionsResponse,
  transactionConnectionsResponse,
}: {
  serviceName?: string;
  environment?: string;
  start: number;
  end: number;
  spanConnectionsResponse: SpanConnectionsResponse;
  transactionConnectionsResponse: TransactionConnectionsResponse;
}) {
  const connections: ConnectionResponse[] =
    (spanConnectionsResponse ?? [])
      // @ts-expect-error
      .concat(transactionConnectionsResponse ?? [])
      .map((bucket) => {
        const latest = bucket.latest.top[0].metrics;

        const isSpanBucket = latest['span.type'] !== undefined;

        return {
          'service.name': bucket.key.serviceName as string,
          'service.environment': latest['service.environment'] as string | null,
          'agent.name': latest['agent.name'] as AgentName,
          'span.destination.service.hash': bucket.key.downstreamHash as
            | string
            | null,
          'transaction.upstream.hash': bucket.key.upstreamHash as string | null,
          'span.type': latest['span.type'] as string | null,
          'span.subtype': latest['span.subtype'] as string | null,
          'span.destination.service.resource': latest[
            'span.destination.service.resource'
          ] as string | null,
          stats: isSpanBucket
            ? {
                averageLatency:
                  (bucket.latency.value ?? 0) / bucket.count.value!,
                failurePercentage:
                  bucket.failed.count.value! /
                  (bucket.failed.count.value! + bucket.successful.count.value!),
                throughputPerMinute: calculateThroughput({
                  start,
                  end,
                  value: bucket.count.value!,
                }),
              }
            : undefined,
        };
      }) ?? [];

  const [spanConnections, transactionConnections] = partition(
    connections,
    (connection) => !!connection['span.type']
  );

  const connectionsByUpstreamHash = groupBy(
    spanConnections,
    (connection) => connection['transaction.upstream.hash']
  );

  transactionConnections.forEach((connection) => {
    const upstreamHash = String(connection['transaction.upstream.hash']);

    const connectionsForUpstreamHash =
      connectionsByUpstreamHash[upstreamHash] || [];

    if (
      !connectionsForUpstreamHash.some((c) => {
        return c['service.name'] === connection['service.name'];
      })
    ) {
      connectionsForUpstreamHash.push(connection);
      connectionsByUpstreamHash[upstreamHash] = connectionsForUpstreamHash;
    }
  });

  const rootConnections = connections.filter(
    (connection) => connection['transaction.upstream.hash'] === null
  );

  function getEdges(connection: ConnectionResponse): Edge[] {
    const callees =
      (connection['span.destination.service.hash'] &&
        connectionsByUpstreamHash[
          connection['span.destination.service.hash']
        ]) ||
      [];

    const caller = connection;

    const stats = connection.stats!;

    const edge = {
      caller,
      callees: uniqBy(callees, (callee) => callee['service.name']),
      stats,
    };

    const nextConnections = callees.filter(
      (callee) => callee['span.destination.service.hash']
    );

    if (!nextConnections.length) {
      return [edge];
    }

    return nextConnections.flatMap((nextConnection) => {
      const nextEdges = getEdges(nextConnection);
      return nextEdges.map((next) => ({ ...edge, next }));
    });
  }

  const rootEdges = rootConnections.flatMap((connection) =>
    getEdges(connection)
  );

  function filterPaths(name: string, edges: Edge[]): Edge[] {
    return edges.filter((edge) => {
      return (
        edge.caller['service.name'] === name ||
        edge.callees.some((callee) => callee['service.name'] === name) ||
        (edge.next && filterPaths(name, [edge.next]).length)
      );
    });
  }

  const filteredRootEdges = serviceName
    ? filterPaths(serviceName, rootEdges)
    : rootEdges;

  const connectionsForServiceMap: Connection[] = [];

  function getConnectionNode(
    conn: ConnectionResponse,
    type: 'service' | 'external'
  ): ConnectionNode {
    if (type === 'external') {
      const externalNode: ExternalConnectionNode = {
        id: `>${conn['span.destination.service.resource']}`,
        'span.destination.service.resource':
          conn['span.destination.service.resource']!,
        'span.type': conn['span.type']!,
        'span.subtype': conn['span.subtype'] ?? '',
      };
      return externalNode;
    }

    const serviceNode: ServiceConnectionNode = {
      id: conn['service.name'],
      'agent.name': conn['agent.name'],
      'service.environment': conn['service.environment'],
      'service.name': conn['service.name'],
    };

    return serviceNode;
  }

  filteredRootEdges.forEach((_edge) => {
    let edge: Edge | undefined = _edge;
    while (edge && edge.caller['span.destination.service.hash']) {
      let source = getConnectionNode(edge.caller, 'service');
      let stats: ConnectionStats | undefined = edge.stats;
      if (
        !edge.callees.length ||
        edge.callees.length > 1 ||
        edge.caller['span.type'] !== 'external'
      ) {
        const destination = getConnectionNode(edge.caller, 'external');
        connectionsForServiceMap.push({
          source,
          destination,
          stats,
        });
        stats = undefined;
        source = destination;
      }

      edge.callees.forEach((callee) => {
        connectionsForServiceMap.push({
          source,
          destination: getConnectionNode(callee, 'service'),
          stats,
        });
      });

      edge = edge.next;
    }
  });

  return uniqBy(
    connectionsForServiceMap,
    (connection) => `${connection.source.id} => ${connection.destination.id}`
  );
}
