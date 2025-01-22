/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy, pickBy, identity } from 'lodash';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../common/es_fields/apm';
import type {
  Connection,
  ConnectionNode,
  ServiceConnectionNode,
  ExternalConnectionNode,
  ConnectionElement,
  DiscoveredService,
} from '../../../common/service_map';
import type { ConnectionsResponse, ServicesResponse } from './get_service_map';
import type { ServiceAnomaliesResponse } from './get_service_anomalies';
import type { GroupResourceNodesResponse } from './group_resource_nodes';
import { groupResourceNodes } from './group_resource_nodes';

function getConnectionNodeId(node: ConnectionNode): string {
  if ('span.destination.service.resource' in node) {
    // use a prefix to distinguish exernal destination ids from services
    return `>${node[SPAN_DESTINATION_SERVICE_RESOURCE]}`;
  }
  return node[SERVICE_NAME];
}

export function getConnectionId(connection: Connection) {
  return `${getConnectionNodeId(connection.source)}~${getConnectionNodeId(connection.destination)}`;
}

function addMessagingConnections(
  connections: Connection[],
  discoveredServices: DiscoveredService[]
): Connection[] {
  // Index discoveredServices by SPAN_DESTINATION_SERVICE_RESOURCE for quick lookups
  const serviceMap = new Map(
    discoveredServices.map(({ from, to }) => [from[SPAN_DESTINATION_SERVICE_RESOURCE], to])
  );

  const newConnections: Connection[] = [];
  for (const connection of connections) {
    const destination = connection.destination;
    if (
      destination['span.type'] === 'messaging' &&
      SPAN_DESTINATION_SERVICE_RESOURCE in destination
    ) {
      const matchedService = serviceMap.get(destination[SPAN_DESTINATION_SERVICE_RESOURCE]);
      if (matchedService) {
        newConnections.push({
          source: destination,
          destination: matchedService,
        });
      }
    }
  }

  return [...connections, ...newConnections];
}

export function getAllNodes(
  services: ServiceMapResponse['services'],
  connections: ServiceMapResponse['connections']
) {
  const allNodes: ConnectionNode[] = [];

  // Process connections in one pass
  for (const connection of connections) {
    allNodes.push(
      { ...connection.source, id: getConnectionNodeId(connection.source) },
      { ...connection.destination, id: getConnectionNodeId(connection.destination) }
    );
  }

  // Derive the rest of the map nodes from the connections and add the services
  // from the services data query
  for (const service of services) {
    allNodes.push({
      ...service,
      id: service[SERVICE_NAME],
    });
  }

  return allNodes;
}

export function getServiceNodes(
  allNodes: ConnectionNode[],
  discoveredServices: Array<{
    from: ExternalConnectionNode;
    to: ServiceConnectionNode;
  }>
) {
  const allNodeIds = new Set(allNodes.map((node) => node.id));
  const connectionFromDiscoveredServices: ServiceConnectionNode[] = [];

  for (const { from, to } of discoveredServices) {
    const fromId = getConnectionNodeId(from);
    const toServiceName = to[SERVICE_NAME];

    if (allNodeIds.has(fromId) && !allNodeIds.has(toServiceName)) {
      connectionFromDiscoveredServices.push({ ...to, id: getConnectionNodeId(to) });
    }
  }

  // List of nodes that are services
  const serviceNodes = [...allNodes, ...connectionFromDiscoveredServices].filter(
    (node) => SERVICE_NAME in node
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
  const externalNodesMap = new Map<string, ExternalConnectionNode[]>();
  const serviceNodeMap = new Map<string, ServiceConnectionNode[]>();

  allNodes.forEach((node) => {
    if (SPAN_DESTINATION_SERVICE_RESOURCE in node) {
      const nodeId = node.id!;
      const nodes = externalNodesMap.get(nodeId) ?? [];
      nodes.push(node as ExternalConnectionNode);
      externalNodesMap.set(nodeId, [node as ExternalConnectionNode]);
    }
  });

  // Precompute service node lookups in a single iteration
  serviceNodes.forEach((serviceNode) => {
    const serviceName = serviceNode[SERVICE_NAME];
    const nodes = serviceNodeMap.get(serviceName) ?? [];
    nodes.push(serviceNode);
    serviceNodeMap.set(serviceName, [serviceNode]);
  });

  const serviceAnomalyMap = new Map(
    anomalies.serviceAnomalies.map((item) => [item.serviceName, item])
  );

  const outboundConnectionSet = new Set(
    allConnections
      .filter(
        (connection) =>
          SPAN_DESTINATION_SERVICE_RESOURCE in connection.source &&
          connection.source[SPAN_DESTINATION_SERVICE_RESOURCE]
      )
      .map((connection) => connection.source[SPAN_DESTINATION_SERVICE_RESOURCE])
  );

  const discoveredServiceMap = new Map(
    discoveredServices.map(({ from, to }) => [from[SPAN_DESTINATION_SERVICE_RESOURCE], to])
  );

  // 1. Map external nodes to internal services
  // 2. Collapse external nodes into one node based on span.destination.service.resource
  // 3. Pick the first available span.type/span.subtype in an alphabetically sorted list
  const nodeMap = allNodes.reduce((map, node) => {
    if (!node.id || map[node.id]) {
      return map;
    }

    const outboundConnectionExists = outboundConnectionSet.has(
      node[SPAN_DESTINATION_SERVICE_RESOURCE]
    );

    const matchedService = !outboundConnectionExists
      ? discoveredServiceMap.get(node[SPAN_DESTINATION_SERVICE_RESOURCE])
      : undefined;

    const serviceName =
      matchedService?.[SERVICE_NAME] || (SERVICE_NAME in node ? node[SERVICE_NAME] : undefined);

    if (serviceName) {
      const matchedServiceNodes = (serviceNodeMap.get(serviceName) ?? []).map((serviceNode) =>
        pickBy(serviceNode, identity)
      );
      const mergedServiceNode = Object.assign({}, ...matchedServiceNodes);
      const serviceAnomalyStats = serviceAnomalyMap.get(serviceName);

      if (matchedServiceNodes.length) {
        map[node.id] = {
          id: matchedServiceNodes[0][SERVICE_NAME],
          ...mergedServiceNode,
          ...(serviceAnomalyStats ? { serviceAnomalyStats } : {}),
        };
      }
    } else {
      const allMatchedExternalNodes = externalNodesMap.get(node.id!) ?? [];
      if (allMatchedExternalNodes.length > 0) {
        const firstMatchedNode = allMatchedExternalNodes[0];
        map[node.id] = {
          ...firstMatchedNode,
          label: firstMatchedNode[SPAN_DESTINATION_SERVICE_RESOURCE],
          [SPAN_TYPE]: allMatchedExternalNodes.map((n) => n[SPAN_TYPE]).sort()[0],
          [SPAN_SUBTYPE]: allMatchedExternalNodes.map((n) => n[SPAN_SUBTYPE]).sort()[0],
        };
      }
    }

    return map;
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
        sourceData[SERVICE_NAME] +
        ' to ' +
        (targetData[SERVICE_NAME] || targetData[SPAN_DESTINATION_SERVICE_RESOURCE]);

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

  const dedupedNodes = Array.from(
    new Map(
      mappedConnections
        .flatMap((connection) => [connection.sourceData, connection.targetData])
        .concat(serviceNodes)
        .map((node) => [node.id, node])
    ).values()
  );

  // Instead of adding connections in two directions,
  // we add a `bidirectional` flag to use in styling
  const dedupedConnections = sortBy(mappedConnections, 'id').reduce((prev, connection) => {
    const reverseKey = `${connection.target}-${connection.source}`;
    // Use a Map to track seen connections for fast lookup

    const reverseConnections = prev.get(reverseKey);
    if (reverseConnections) {
      reverseConnections.push({
        ...connection,
        isInverseEdge: true,
      });
      prev.set(reverseKey, reverseConnections);
    } else {
      prev.set(reverseKey, [connection]);
    }

    return prev;
  }, new Map<string, Array<ConnectionElement['data']>>());
  // Put everything together in elements, with everything in the "data" property
  const elements: ConnectionElement[] = [
    ...Array.from(dedupedConnections.values()).flat(),
    ...dedupedNodes,
  ].map((element) => ({
    data: element,
  }));

  return groupResourceNodes({ elements });
}
