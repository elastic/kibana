/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import type { ServiceAnomaliesResponse } from '../../server/routes/service_map/get_service_anomalies';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
} from '../es_fields/apm';
import type {
  Connection,
  ConnectionNode,
  ServiceConnectionNode,
  ExternalConnectionNode,
  ConnectionElement,
  DestinationService,
  ServiceMapExitSpan,
  ServiceMapService,
  ConnectionEdge,
  ServiceMapWithConnections,
} from './types';
import type { GroupResourceNodesResponse } from './group_resource_nodes';
import { groupResourceNodes } from './group_resource_nodes';

const FORBIDDEN_SERVICE_NAMES = ['constructor'];

export const isExitSpan = (node: ConnectionNode): node is ExternalConnectionNode => {
  return !!(node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE];
};

export const getServiceConnectionNode = (event: ServiceMapService): ServiceConnectionNode => {
  return {
    id: event.serviceName,
    [SERVICE_NAME]: event.serviceName,
    [SERVICE_ENVIRONMENT]: event.serviceEnvironment || null,
    [AGENT_NAME]: event.agentName,
  };
};

export const getExternalConnectionNode = (event: ServiceMapExitSpan): ExternalConnectionNode => {
  return {
    id: `>${event.serviceName}|${event.spanDestinationServiceResource}`,
    [SPAN_DESTINATION_SERVICE_RESOURCE]: event.spanDestinationServiceResource,
    [SPAN_TYPE]: event.spanType,
    [SPAN_SUBTYPE]: event.spanSubtype,
  };
};

export function getConnectionId(connection: Connection) {
  return `${connection.source.id}~${connection.destination.id}`;
}

function addMessagingConnections(
  connections: Connection[],
  destinationServices: DestinationService[]
): Connection[] {
  // Index discoveredServices by SPAN_DESTINATION_SERVICE_RESOURCE for quick lookups
  const serviceMap = new Map(
    destinationServices.map(({ from, to }) => [from[SPAN_DESTINATION_SERVICE_RESOURCE], to])
  );

  const newConnections: Connection[] = [];
  for (const connection of connections) {
    const destination = connection.destination;
    if (destination[SPAN_TYPE] === 'messaging' && isExitSpan(destination)) {
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

function getAllNodes(
  services: ServiceMapWithConnections['servicesData'],
  connections: ServiceMapWithConnections['connections']
) {
  const allNodes = new Map<string, ConnectionNode>();

  // Process connections in one pass
  connections.forEach((connection) => {
    const sourceId = connection.source.id;
    const destinationId = connection.destination.id;
    if (!allNodes.has(sourceId)) {
      allNodes.set(sourceId, { ...connection.source, id: sourceId });
    }
    if (!allNodes.has(destinationId)) {
      allNodes.set(destinationId, { ...connection.destination, id: destinationId });
    }
  });

  // Derive the rest of the map nodes from the connections and add the services
  // from the services data query
  services
    .filter((service) => !FORBIDDEN_SERVICE_NAMES.includes(service[SERVICE_NAME]))
    .forEach((service) => {
      const id = service[SERVICE_NAME];
      if (!allNodes.has(id)) {
        allNodes.set(id, { ...service, id });
      }
    });

  return allNodes;
}

function getServiceNodes(
  allNodes: Map<string, ConnectionNode>,
  destinationServices: DestinationService[]
) {
  const connectionFromDiscoveredServices: ServiceConnectionNode[] = [];

  for (const { from, to } of destinationServices) {
    const fromId = from.id;
    const toId = to.id;

    if (allNodes.has(fromId) && !allNodes.has(toId)) {
      connectionFromDiscoveredServices.push({ ...to, id: toId });
    }
  }

  // List of nodes that are services
  const serviceNodes = new Map(
    [...Array.from(allNodes.values()), ...connectionFromDiscoveredServices]
      .filter((node): node is ServiceConnectionNode => !isExitSpan(node))
      .map((node) => [node.id, node])
  );

  return serviceNodes;
}

function getExternalNodes(allNodes: Map<string, ConnectionNode>) {
  return new Map(
    Array.from(allNodes.values()).reduce((acc, node) => {
      if (!isExitSpan(node)) {
        return acc;
      }

      const nodes = acc.get(node.id) ?? [];
      nodes.push(node as ExternalConnectionNode);
      acc.set(node.id, nodes);

      return acc;
    }, new Map<string, ExternalConnectionNode[]>())
  );
}

function groupNodes({
  allNodes,
  allConnections,
  anomalies,
  destinationServices,
  serviceNodes,
}: {
  allNodes: Map<string, ConnectionNode>;
  allConnections: Connection[];
  destinationServices: DestinationService[];
  anomalies: ServiceAnomaliesResponse;
  serviceNodes: Map<string, ServiceConnectionNode>;
}) {
  const externalNodes = getExternalNodes(allNodes);

  const destinationServiceMap = destinationServices.reduce((acc, { from, to }) => {
    const currentDestinations = acc.get(from.id) ?? [];
    currentDestinations.push(to);
    acc.set(from.id, currentDestinations);
    return acc;
  }, new Map<string, ServiceConnectionNode[]>());

  const serviceAnomalyMap = new Map(
    anomalies.serviceAnomalies.map((item) => [item.serviceName, item])
  );

  const outboundConnectionSet = new Set(
    allConnections.reduce<string[]>((acc, node) => {
      if (isExitSpan(node.source)) {
        acc.push(node.source.id);
      }
      return acc;
    }, [])
  );

  // 1. Map external nodes to internal services
  // 2. Collapse external nodes into one node based on span.destination.service.resource
  // 3. Pick the first available span.type/span.subtype in an alphabetically sorted list
  return Array.from(allNodes.entries()).reduce((map, [id, node]) => {
    if (map.has(id)) {
      return map;
    }

    const outboundConnectionExists = isExitSpan(node) && outboundConnectionSet.has(node.id);
    const matchedDestinationServices = !outboundConnectionExists
      ? destinationServiceMap.get(node.id) ?? []
      : [];

    const isServiceNode = matchedDestinationServices.length > 0 || !isExitSpan(node);

    if (isServiceNode) {
      const destinationIds = new Set([...matchedDestinationServices.map((n) => n.id), node.id]);

      destinationIds.forEach((destinationId) => {
        const serviceNode = serviceNodes.get(destinationId);
        const serviceAnomalyStats = serviceAnomalyMap.get(destinationId);

        if (serviceNode) {
          map.set(node.id, {
            ...serviceNode,
            ...(serviceAnomalyStats ? { serviceAnomalyStats } : {}),
          });
        }
      });
    } else {
      const allMatchedExternalNodes = externalNodes.get(id) ?? [];
      if (allMatchedExternalNodes.length > 0) {
        const firstMatchedNode = allMatchedExternalNodes[0];
        map.set(id, {
          ...firstMatchedNode,
          label: firstMatchedNode[SPAN_DESTINATION_SERVICE_RESOURCE],
          [SPAN_TYPE]: allMatchedExternalNodes.map((n) => n[SPAN_TYPE]).sort()[0],
          [SPAN_SUBTYPE]: allMatchedExternalNodes.map((n) => n[SPAN_SUBTYPE]).sort()[0],
        });
      }
    }

    return map;
  }, new Map<string, ConnectionNode>());
}

export function transformServiceMapResponses({
  destinationServices,
  servicesData,
  connections,
  anomalies,
}: ServiceMapWithConnections): GroupResourceNodesResponse {
  const allConnections = addMessagingConnections(connections, destinationServices);
  const allNodes = getAllNodes(servicesData, allConnections);
  const serviceNodes = getServiceNodes(allNodes, destinationServices);

  const nodeMap = groupNodes({
    allNodes,
    allConnections,
    destinationServices,
    anomalies,
    serviceNodes,
  });

  // Build connections with mapped nodes
  const uniqueConnections = allConnections.reduce((acc, connection) => {
    const sourceData = nodeMap.get(connection.source.id);
    const targetData = nodeMap.get(connection.destination.id);

    if (!sourceData || !targetData || sourceData.id === targetData.id) {
      return acc;
    }

    const label =
      sourceData[SERVICE_NAME] +
      ' to ' +
      (targetData[SERVICE_NAME] || targetData[SPAN_DESTINATION_SERVICE_RESOURCE]);

    const id = getConnectionId({ source: sourceData, destination: targetData });

    acc.set(id, {
      source: sourceData.id,
      target: targetData.id,
      label,
      id,
      sourceData,
      targetData,
    });

    return acc;
  }, new Map<string, ConnectionEdge & { sourceData: ConnectionNode; targetData: ConnectionNode }>());

  const mappedConnections = Array.from(uniqueConnections.values());
  const dedupedNodes = Array.from(
    new Map(
      mappedConnections
        .flatMap((connection) => [connection.sourceData, connection.targetData])
        .concat(Array.from(serviceNodes.values()))
        .map((node) => [node.id, node])
    ).values()
  );

  // Instead of adding connections in two directions,
  // we add a `bidirectional` flag to use in styling
  const dedupedConnections = sortBy(
    mappedConnections,
    // make sure that order is stable
    'id'
  ).reduce<Array<ConnectionElement['data']>>((prev, connection) => {
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
  }, []);

  // Put everything together in elements, with everything in the "data" property
  const elements: ConnectionElement[] = [
    ...Array.from(dedupedConnections.values()),
    ...dedupedNodes,
  ].map((element) => ({
    data: element,
  }));

  return groupResourceNodes({ elements });
}
