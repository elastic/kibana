/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual, sortBy } from 'lodash';
import { ValuesType } from 'utility-types';
import { ConnectionNode, Connection } from '../../../common/service_map';
import { ConnectionsResponse, ServicesResponse } from './get_service_map';

function getConnectionNodeId(node: ConnectionNode): string {
  if ('destination.address' in node) {
    // use a prefix to distinguish exernal destination ids from services
    return `>${node['destination.address']}`;
  }
  return node['service.name'];
}

function getConnectionId(connection: Connection) {
  return `${getConnectionNodeId(connection.source)}~${getConnectionNodeId(
    connection.destination
  )}`;
}

type ServiceMapResponse = ConnectionsResponse & { services: ServicesResponse };

export function dedupeConnections(response: ServiceMapResponse) {
  const { discoveredServices, services, connections } = response;

  const serviceNodes = services.map(service => ({
    ...service,
    id: service['service.name']
  }));

  // maps destination.address to service.name if possible
  function getConnectionNode(node: ConnectionNode) {
    let mappedNode: ConnectionNode | undefined;

    if ('destination.address' in node) {
      mappedNode = discoveredServices.find(map => isEqual(map.from, node))?.to;
    }

    if (!mappedNode) {
      mappedNode = node;
    }

    return {
      ...mappedNode,
      id: getConnectionNodeId(mappedNode)
    };
  }

  // build connections with mapped nodes
  const mappedConnections = connections
    .map(connection => {
      const source = getConnectionNode(connection.source);
      const destination = getConnectionNode(connection.destination);

      return {
        source,
        destination,
        id: getConnectionId({ source, destination })
      };
    })
    .filter(connection => connection.source.id !== connection.destination.id);

  const nodes = mappedConnections
    .flatMap(connection => [connection.source, connection.destination])
    .concat(serviceNodes);

  const dedupedNodes: typeof nodes = [];

  nodes.forEach(node => {
    if (!dedupedNodes.find(dedupedNode => isEqual(node, dedupedNode))) {
      dedupedNodes.push(node);
    }
  });

  type ConnectionWithId = ValuesType<typeof mappedConnections>;

  const connectionsById = mappedConnections.reduce(
    (connectionMap, connection) => {
      return {
        ...connectionMap,
        [connection.id]: connection
      };
    },
    {} as Record<string, ConnectionWithId>
  );

  // instead of adding connections in two directions,
  // we add a `bidirectional` flag to use in styling
  const dedupedConnections = (sortBy(
    Object.values(connectionsById),
    // make sure that order is stable
    'id'
  ) as ConnectionWithId[]).reduce<
    Array<
      ConnectionWithId & { bidirectional?: boolean; isInverseEdge?: boolean }
    >
  >((prev, connection) => {
    const reversedConnection = prev.find(
      c =>
        c.destination.id === connection.source.id &&
        c.source.id === connection.destination.id
    );

    if (reversedConnection) {
      reversedConnection.bidirectional = true;
      return prev.concat({
        ...connection,
        isInverseEdge: true
      });
    }

    return prev.concat(connection);
  }, []);

  return {
    nodes: dedupedNodes,
    connections: dedupedConnections
  };
}
