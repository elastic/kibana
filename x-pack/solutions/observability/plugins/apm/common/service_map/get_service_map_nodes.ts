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
} from '../es_fields/apm';
import type { ExitSpanDestination, ServicesResponse } from './types';
import type {
  Connection,
  ConnectionNode,
  ServiceConnectionNode,
  ExternalConnectionNode,
  ConnectionElement,
  ConnectionEdge,
  ServiceMapConnections,
  GroupResourceNodesResponse,
} from './types';

import { groupResourceNodes } from './group_resource_nodes';
import { getEdgeId, isExitSpan } from './utils';

const FORBIDDEN_SERVICE_NAMES = ['constructor'];

function addMessagingConnections(
  connections: Connection[],
  destinationServices: ExitSpanDestination[]
): Connection[] {
  const serviceMap = new Map(
    destinationServices.map(({ from, to }) => [from[SPAN_DESTINATION_SERVICE_RESOURCE], to])
  );

  const messagingConnections = connections.reduce<Connection[]>((acc, connection) => {
    const destination = connection.destination;
    if (isExitSpan(destination) && destination[SPAN_TYPE] === 'messaging') {
      const matchedService = serviceMap.get(destination[SPAN_DESTINATION_SERVICE_RESOURCE]);
      if (matchedService) {
        acc.push({
          source: destination,
          destination: matchedService,
        });
      }
    }
    return acc;
  }, []);

  return [...connections, ...messagingConnections];
}

function getAllNodes(services: ServicesResponse[], connections: Connection[]) {
  const allNodesMap = new Map<string, ConnectionNode>();

  connections.forEach((connection) => {
    const sourceId = connection.source.id;
    const destinationId = connection.destination.id;
    if (!allNodesMap.has(sourceId)) {
      allNodesMap.set(sourceId, { ...connection.source, id: sourceId });
    }
    if (!allNodesMap.has(destinationId)) {
      allNodesMap.set(destinationId, { ...connection.destination, id: destinationId });
    }
  });

  // Derive the rest of the map nodes from the connections and add the services
  // from the services data query
  services.forEach((service) => {
    const id = service[SERVICE_NAME];
    if (!allNodesMap.has(id) && !FORBIDDEN_SERVICE_NAMES.includes(service[SERVICE_NAME])) {
      allNodesMap.set(id, { ...service, id });
    }
  });

  return allNodesMap;
}

function getAllServices(
  allNodes: Map<string, ConnectionNode>,
  destinationServices: ExitSpanDestination[]
) {
  const serviceNodes = new Map<string, ServiceConnectionNode>();

  for (const { from, to } of destinationServices) {
    const fromId = from.id;
    const toId = to.id;

    if (allNodes.has(fromId) && !allNodes.has(toId)) {
      serviceNodes.set(toId, { ...to, id: toId });
    }
  }

  for (const node of allNodes.values()) {
    if (!isExitSpan(node)) {
      serviceNodes.set(node.id, node);
    }
  }

  return serviceNodes;
}

function getExitSpans(allNodes: Map<string, ConnectionNode>) {
  const exitSpans = new Map<string, ExternalConnectionNode[]>();

  for (const node of allNodes.values()) {
    if (isExitSpan(node)) {
      const nodes = exitSpans.get(node.id) ?? [];
      nodes.push(node as ExternalConnectionNode);
      exitSpans.set(node.id, nodes);
    }
  }

  return exitSpans;
}

function exitSpanDestinationsToMap(destinationServices: ExitSpanDestination[]) {
  return destinationServices.reduce((acc, { from, to }) => {
    acc.set(from.id, to);
    return acc;
  }, new Map<string, ServiceConnectionNode>());
}

function mapNodes({
  allConnections,
  anomalies,
  nodes,
  exitSpanDestinations,
  services,
}: {
  allConnections: Connection[];
  anomalies: ServiceAnomaliesResponse;
  nodes: Map<string, ConnectionNode>;
  services: Map<string, ServiceConnectionNode>;
  exitSpanDestinations: ExitSpanDestination[];
}) {
  const exitSpanDestinationsMap = exitSpanDestinationsToMap(exitSpanDestinations);
  const exitSpans = getExitSpans(nodes);
  const anomaliesByServiceName = new Map(
    anomalies.serviceAnomalies.map((item) => [item.serviceName, item])
  );

  const messagingSpanIds = new Set(
    allConnections.filter(({ source }) => isExitSpan(source)).map(({ source }) => source.id)
  );

  // 1. Map external nodes to internal services
  // 2. Collapse external nodes into one node based on span.destination.service.resource
  // 3. Pick the first available span.type/span.subtype in an alphabetically sorted list
  const mappedNodes = new Map<string, ConnectionNode>();
  for (const [id, node] of nodes.entries()) {
    if (mappedNodes.has(id)) {
      continue;
    }

    const isMessagingSpan = messagingSpanIds.has(node.id);
    const destinationService = isMessagingSpan ? undefined : exitSpanDestinationsMap.get(node.id);
    const isServiceNode = !!destinationService || !isExitSpan(node);

    if (isServiceNode) {
      const serviceId = destinationService ? destinationService.id : node.id;
      const serviceNode = services.get(serviceId);

      if (serviceNode) {
        const serviceAnomalyStats = anomaliesByServiceName.get(serviceNode.id);

        mappedNodes.set(node.id, {
          ...serviceNode,
          ...(serviceAnomalyStats ? { serviceAnomalyStats } : null),
        });
      }
    } else {
      const exitSpanNodes = exitSpans.get(id) ?? [];
      if (exitSpanNodes.length > 0) {
        const exitSpanSample = exitSpanNodes[0];
        mappedNodes.set(id, {
          ...exitSpanSample,
          label: exitSpanSample[SPAN_DESTINATION_SERVICE_RESOURCE],
          [SPAN_TYPE]: exitSpanNodes.map((n) => n[SPAN_TYPE]).sort()[0],
          [SPAN_SUBTYPE]: exitSpanNodes.map((n) => n[SPAN_SUBTYPE]).sort()[0],
        });
      }
    }
  }

  return mappedNodes;
}

function mapEdges({
  allConnections,
  nodes,
}: {
  allConnections: Connection[];
  nodes: Map<string, ConnectionNode>;
}) {
  const connections = allConnections.reduce((acc, connection) => {
    const sourceData = nodes.get(connection.source.id);
    const targetData = nodes.get(connection.destination.id);

    if (!sourceData || !targetData || sourceData.id === targetData.id) {
      return acc;
    }

    const label = `${sourceData[SERVICE_NAME]} to ${
      targetData[SERVICE_NAME] || targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
    }`;
    const id = getEdgeId(sourceData.id, targetData.id);

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

  return [...connections.values()];
}

function markBidirectionalConnections({ connections }: { connections: ConnectionEdge[] }) {
  const targets = new Map<string, ConnectionEdge>();

  for (const connection of connections) {
    const edgeId = getEdgeId(connection.source, connection.target);
    const reversedConnection = targets.get(edgeId);

    if (reversedConnection) {
      reversedConnection.bidirectional = true;
      connection.isInverseEdge = true;
    }

    targets.set(edgeId, connection);
  }

  return targets.values();
}

export function getServiceMapNodes({
  connections,
  exitSpanDestinations,
  servicesData,
  anomalies,
}: ServiceMapConnections): GroupResourceNodesResponse {
  const allConnections = addMessagingConnections(connections, exitSpanDestinations);
  const allNodes = getAllNodes(servicesData, allConnections);
  const allServices = getAllServices(allNodes, exitSpanDestinations);

  const nodes = mapNodes({
    allConnections,
    nodes: allNodes,
    services: allServices,
    exitSpanDestinations,
    anomalies,
  });

  // Build connections with mapped nodes
  const mappedEdges = mapEdges({ allConnections, nodes });

  const uniqueNodes = mappedEdges
    .flatMap((connection) => [connection.sourceData, connection.targetData])
    .concat(...allServices.values())
    .reduce((acc, node) => {
      if (!acc.has(node.id)) {
        acc.set(node.id, node);
      }
      return acc;
    }, new Map<string, ConnectionNode>())
    .values();

  // Instead of adding connections in two directions,
  // we add a `bidirectional` flag to use in styling
  const edges = markBidirectionalConnections({
    connections: sortBy(mappedEdges, 'id'),
  });

  // Put everything together in elements, with everything in the "data" property
  const elements: ConnectionElement[] = [...edges, ...uniqueNodes].map((element) => ({
    data: element,
  }));

  return groupResourceNodes({ elements });
}
