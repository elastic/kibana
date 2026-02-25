/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAnomalyStats } from '../anomaly_detection';
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
  ConnectionEdge,
} from './types';

import { getEdgeId, getExitSpanNodeId, isExitSpan, toDisplayName } from './utils';
import { FORBIDDEN_SERVICE_NAMES } from './constants';

// Exports helper functions for use in React Flow transformation

export function addMessagingConnections(
  connections: Connection[],
  destinationServices: ExitSpanDestination[]
): Connection[] {
  const servicesByDestination = destinationServices.reduce((acc, { from, to }) => {
    const key = from[SPAN_DESTINATION_SERVICE_RESOURCE];

    const currentDestinations = acc.get(key) ?? [];
    currentDestinations.push(to);

    acc.set(key, currentDestinations);

    return acc;
  }, new Map<string, ServiceConnectionNode[]>());

  const messagingConnections = connections.reduce<Connection[]>((acc, connection) => {
    const destination = connection.destination;
    if (isExitSpan(destination) && destination[SPAN_TYPE] === 'messaging') {
      const matchedServices =
        servicesByDestination.get(destination[SPAN_DESTINATION_SERVICE_RESOURCE]) ?? [];
      matchedServices.forEach((matchedService) => {
        acc.push({
          source: destination,
          destination: matchedService,
        });
      });
    }
    return acc;
  }, []);

  return [...connections, ...messagingConnections];
}

export function getAllNodes(services: ServicesResponse[], connections: Connection[]) {
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

export function getAllServices(
  allNodes: Map<string, ConnectionNode>,
  destinationServices: ExitSpanDestination[],
  anomalies: ServiceAnomaliesResponse
) {
  const anomaliesByServiceName = new Map<string, ServiceAnomalyStats>(
    anomalies.serviceAnomalies.map((item) => [item.serviceName, item])
  );

  const serviceNodes = new Map<string, ServiceConnectionNode>();

  for (const { from, to } of destinationServices) {
    const fromId = from.id;
    const toId = to.id;

    if (allNodes.has(fromId) && !allNodes.has(toId)) {
      serviceNodes.set(toId, {
        ...to,
        id: toId,
        serviceAnomalyStats: anomaliesByServiceName.get(to.id),
      });
    }
  }

  for (const node of allNodes.values()) {
    if (!isExitSpan(node)) {
      serviceNodes.set(node.id, {
        ...node,
        serviceAnomalyStats: anomaliesByServiceName.get(node.id),
      });
    }
  }

  return serviceNodes;
}

export function getExitSpans(allNodes: Map<string, ConnectionNode>) {
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

export function exitSpanDestinationsToMap(destinationServices: ExitSpanDestination[]) {
  return destinationServices.reduce((acc, { from, to }) => {
    acc.set(from.id, to);
    return acc;
  }, new Map<string, ServiceConnectionNode>());
}

export function mapNodes({
  allConnections,
  nodes,
  exitSpanDestinations,
  services,
}: {
  allConnections: Connection[];
  nodes: Map<string, ConnectionNode>;
  services: Map<string, ServiceConnectionNode>;
  exitSpanDestinations: ExitSpanDestination[];
}) {
  const exitSpanDestinationsMap = exitSpanDestinationsToMap(exitSpanDestinations);
  const exitSpans = getExitSpans(nodes);

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
        // Preserve the original span.destination.service.resource when mapping exit span to service
        // This is needed for service-to-service edge metrics
        const originalResource = isExitSpan(node)
          ? (node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE]
          : undefined;

        mappedNodes.set(node.id, {
          ...serviceNode,
          ...(originalResource && { [SPAN_DESTINATION_SERVICE_RESOURCE]: originalResource }),
        });
      }
    } else {
      const exitSpanNodes = exitSpans.get(id) ?? [];
      if (exitSpanNodes.length > 0) {
        const exitSpanSample = exitSpanNodes[0];

        mappedNodes.set(id, {
          ...exitSpanSample,
          id: getExitSpanNodeId(exitSpanSample),
          label: exitSpanSample[SPAN_DESTINATION_SERVICE_RESOURCE],
          [SPAN_TYPE]: exitSpanNodes.map((n) => n[SPAN_TYPE]).sort()[0],
          [SPAN_SUBTYPE]: exitSpanNodes.map((n) => n[SPAN_SUBTYPE]).sort()[0],
        });
      }
    }
  }

  return mappedNodes;
}

function getConnectionNodeLabel(node: ConnectionNode): string {
  const fallback = toDisplayName(node.id);
  if (isExitSpan(node)) {
    return node[SPAN_DESTINATION_SERVICE_RESOURCE] ?? node.label ?? fallback;
  }
  return node[SERVICE_NAME] ?? node.label ?? fallback;
}

export function mapEdges({
  allConnections,
  nodes,
}: {
  allConnections: Connection[];
  nodes: Map<string, ConnectionNode>;
}) {
  const resourcesMap = new Map<string, Set<string>>();

  const connections = allConnections.reduce((acc, connection) => {
    const sourceData = nodes.get(connection.source.id);
    const targetData = nodes.get(connection.destination.id);

    if (!sourceData || !targetData || sourceData.id === targetData.id) {
      return acc;
    }

    const id = getEdgeId(sourceData.id, targetData.id);
    const resource = isExitSpan(targetData)
      ? targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
      : undefined;

    const existingEdge = acc.get(id);
    if (existingEdge) {
      const resourceSet = resourcesMap.get(id);
      if (resource && resourceSet && !resourceSet.has(resource)) {
        resourceSet.add(resource);
        existingEdge.resources?.push(resource);
      }
      return acc;
    }

    const sourceLabel = getConnectionNodeLabel(sourceData);
    const targetLabel = getConnectionNodeLabel(targetData);
    const label = `${sourceLabel} to ${targetLabel}`;

    resourcesMap.set(id, new Set(resource ? [resource] : []));

    acc.set(id, {
      source: sourceData.id,
      target: targetData.id,
      label,
      id,
      sourceData,
      targetData,
      sourceLabel,
      targetLabel,
      resources: resource ? [resource] : [],
    });

    return acc;
  }, new Map<string, ConnectionEdge>());

  return [...connections.values()];
}

export function markBidirectionalConnections({ connections }: { connections: ConnectionEdge[] }) {
  const targets = new Map<string, ConnectionEdge>();

  for (const connection of connections) {
    const edgeId = getEdgeId(connection.source, connection.target);
    const reverseEdgeId = getEdgeId(connection.target, connection.source);
    const reversedConnection = targets.get(reverseEdgeId);

    if (reversedConnection) {
      reversedConnection.bidirectional = true;
      connection.isInverseEdge = true;
    }

    targets.set(edgeId, connection);
  }

  return targets.values();
}
