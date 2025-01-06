/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy, pickBy, identity } from 'lodash';
import type { ValuesType } from 'utility-types';
import type {
  Connection,
  ConnectionNode,
  ServiceConnectionNode,
  ExternalConnectionNode,
  ConnectionElement,
} from '../../../common/service_map';
import type { ConnectionsResponse, ServicesResponse } from './get_service_map';
import type { ServiceAnomaliesResponse } from './get_service_anomalies';
import type { GroupResourceNodesResponse } from './group_resource_nodes';
import { groupResourceNodes } from './group_resource_nodes';

function getConnectionNodeId(node: ConnectionNode): string {
  if ('spanDestinationServiceResource' in node) {
    // use a prefix to distinguish exernal destination ids from services
    return `>${node.spanDestinationServiceResource}`;
  }
  return node.serviceName;
}

export function getConnectionId(connection: Connection) {
  return `${getConnectionNodeId(connection.source)}~${getConnectionNodeId(connection.destination)}`;
}

function addMessagingConnections(
  connections: Connection[],
  discoveredServices: Array<{
    from: ExternalConnectionNode;
    to: ServiceConnectionNode;
  }>
): Connection[] {
  const messagingDestinations = connections
    .map((connection) => connection.destination)
    .filter((dest) => dest.spanType === 'messaging' && 'spanDestinationServiceResource' in dest);

  const newConnections = messagingDestinations
    .map((node) => {
      const matchedService = discoveredServices.find(
        ({ from }) => node.spanDestinationServiceResource === from.spanDestinationServiceResource
      )?.to;
      if (matchedService) {
        return {
          source: node,
          destination: matchedService,
        };
      }
      return undefined;
    })
    .filter((c) => c !== undefined) as Connection[];

  return [...connections, ...newConnections];
}

export function getAllNodes(
  services: ServiceMapResponse['services'],
  connections: ServiceMapResponse['connections']
) {
  // Derive the rest of the map nodes from the connections and add the services
  // from the services data query
  const allNodes: ConnectionNode[] = connections
    .flatMap((connection) => [connection.source, connection.destination])
    .map((node) => ({ ...node, id: getConnectionNodeId(node) }))
    .concat(
      services.map((service) => ({
        ...service,
        id: service.serviceName,
      }))
    );

  return allNodes;
}

export function getServiceNodes(
  allNodes: ConnectionNode[],
  discoveredServices: Array<{
    from: ExternalConnectionNode;
    to: ServiceConnectionNode;
  }>
) {
  const connectionFromDiscoveredServices = discoveredServices
    .filter(({ from, to }) => {
      return (
        allNodes.some((node) => node.id === getConnectionNodeId(from)) &&
        !allNodes.some((node) => node.id === to.serviceName)
      );
    })
    .map(({ to }) => ({ ...to, id: getConnectionNodeId(to) }));
  // List of nodes that are services
  const serviceNodes = [...allNodes, ...connectionFromDiscoveredServices].filter(
    (node) => 'serviceName' in node
  ) as ServiceConnectionNode[];

  return serviceNodes;
}

export type ServiceMapResponse = ConnectionsResponse & {
  services: ServicesResponse;
  anomalies: ServiceAnomaliesResponse;
};

export type TransformServiceMapResponse = GroupResourceNodesResponse;

export function transformServiceMapResponses({
  response,
}: {
  response: ServiceMapResponse;
}): TransformServiceMapResponse {
  const { discoveredServices, services, connections, anomalies } = response;
  const allConnections = addMessagingConnections(connections, discoveredServices);
  const allNodes = getAllNodes(services, allConnections);
  const serviceNodes = getServiceNodes(allNodes, discoveredServices);

  // List of nodes that are externals
  const externalNodes = Array.from(
    new Set(
      allNodes.filter(
        (node) => 'spanDestinationServiceResource' in node
      ) as ExternalConnectionNode[]
    )
  );

  // 1. Map external nodes to internal services
  // 2. Collapse external nodes into one node based on span.destination.service.resource
  // 3. Pick the first available span.type/span.subtype in an alphabetically sorted list
  const nodeMap = allNodes.reduce((map, node) => {
    if (!node.id || map[node.id]) {
      return map;
    }
    const outboundConnectionExists = allConnections.some(
      (con) =>
        'spanDestinationServiceResource' in con.source &&
        con.source.spanDestinationServiceResource === node.spanDestinationServiceResource
    );
    const matchedService = discoveredServices.find(({ from }) => {
      if (!outboundConnectionExists && 'spanDestinationServiceResource' in node) {
        return node.spanDestinationServiceResource === from.spanDestinationServiceResource;
      }
      return false;
    })?.to;

    let serviceName: string | undefined = matchedService?.serviceName;

    if (!serviceName && 'serviceName' in node) {
      serviceName = node.serviceName;
    }

    const matchedServiceNodes = serviceNodes
      .filter((serviceNode) => serviceNode.serviceName === serviceName)
      .map((serviceNode) => pickBy(serviceNode, identity));
    const mergedServiceNode = Object.assign({}, ...matchedServiceNodes);

    const serviceAnomalyStats = serviceName
      ? anomalies.serviceAnomalies.find((item) => item.serviceName === serviceName)
      : undefined;

    if (matchedServiceNodes.length) {
      return {
        ...map,
        [node.id]: {
          id: matchedServiceNodes[0].serviceName,
          ...mergedServiceNode,
          ...(serviceAnomalyStats ? { serviceAnomalyStats } : null),
        },
      };
    }

    const allMatchedExternalNodes = externalNodes.filter((n) => n.id === node.id);

    const firstMatchedNode = allMatchedExternalNodes[0];

    return {
      ...map,
      [node.id]: {
        ...firstMatchedNode,
        label: firstMatchedNode.spanDestinationServiceResource,
        spanType: allMatchedExternalNodes.map((n) => n.spanType).sort()[0],
        spanSubtype: allMatchedExternalNodes.map((n) => n.spanSubtype).sort()[0],
      },
    };
  }, {} as Record<string, ConnectionNode>);

  // Map destination.address to service.name if possible
  function getConnectionNode(node: ConnectionNode) {
    return nodeMap[getConnectionNodeId(node)];
  }

  // Build connections with mapped nodes
  const mappedConnections = allConnections
    .map((connection) => {
      const sourceData = getConnectionNode(connection.source);
      const targetData = getConnectionNode(connection.destination);

      const label =
        sourceData.serviceName +
        ' to ' +
        (targetData.serviceName || targetData.spanDestinationServiceResource);

      return {
        source: sourceData.id,
        target: targetData.id,
        label,
        id: getConnectionId({ source: sourceData, destination: targetData }),
        sourceData,
        targetData,
      };
    })
    .filter((connection) => connection.source !== connection.target);

  const nodes = mappedConnections
    .flatMap((connection) => [connection.sourceData, connection.targetData])
    .concat(serviceNodes);

  const dedupedNodes: typeof nodes = [];

  nodes.forEach((node) => {
    if (!dedupedNodes.find((dedupedNode) => node.id === dedupedNode.id)) {
      dedupedNodes.push(node);
    }
  });

  type ConnectionWithId = ValuesType<typeof mappedConnections>;

  const connectionsById = mappedConnections.reduce((connectionMap, connection) => {
    connectionMap[connection.id] = connection;
    return connectionMap;
  }, {} as Record<string, ConnectionWithId>);

  // Instead of adding connections in two directions,
  // we add a `bidirectional` flag to use in styling
  const dedupedConnections = (
    sortBy(
      Object.values(connectionsById),
      // make sure that order is stable
      'id'
    ) as ConnectionWithId[]
  ).reduce<Array<ConnectionWithId & { bidirectional?: boolean; isInverseEdge?: boolean }>>(
    (prev, connection) => {
      const reversedConnection = prev.find(
        (c) => c.target === connection.source && c.source === connection.target
      );

      if (reversedConnection) {
        reversedConnection.bidirectional = true;
        return prev.concat({
          ...connection,
          isInverseEdge: true,
        });
      }

      return prev.concat(connection);
    },
    []
  );

  // Put everything together in elements, with everything in the "data" property
  const elements: ConnectionElement[] = [...dedupedConnections, ...dedupedNodes].map((element) => ({
    data: element,
  }));

  return groupResourceNodes({ elements });
}
