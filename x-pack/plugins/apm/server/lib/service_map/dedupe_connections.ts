/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEqual, sortBy } from 'lodash';
import { ValuesType } from 'utility-types';
import {
  DESTINATION_ADDRESS,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import {
  Connection,
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode
} from '../../../common/service_map';
import { ConnectionsResponse, ServicesResponse } from './get_service_map';

function getConnectionNodeId(node: ConnectionNode): string {
  if (DESTINATION_ADDRESS in node) {
    // use a prefix to distinguish exernal destination ids from services
    return `>${(node as ExternalConnectionNode)[DESTINATION_ADDRESS]}`;
  }
  return (node as ServiceConnectionNode)[SERVICE_NAME];
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
    id: service[SERVICE_NAME]
  }));

  // maps destination.address to service.name if possible
  function getConnectionNode(node: ConnectionNode) {
    let mappedNode: ConnectionNode | undefined;

    if (DESTINATION_ADDRESS in node) {
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
      const sourceData = getConnectionNode(connection.source);
      const targetData = getConnectionNode(connection.destination);

      return {
        source: sourceData.id,
        target: targetData.id,
        id: getConnectionId({ source: sourceData, destination: targetData }),
        sourceData,
        targetData
      };
    })
    .filter(connection => connection.source !== connection.target);

  const nodes = mappedConnections
    .flatMap(connection => [connection.sourceData, connection.targetData])
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
      c => c.target === connection.source && c.source === connection.target
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

  // Put everything together in elements, with everything in the "data" property
  const elements = [...dedupedConnections, ...dedupedNodes].map(element => ({
    data: element
  }));

  return { elements };
}
