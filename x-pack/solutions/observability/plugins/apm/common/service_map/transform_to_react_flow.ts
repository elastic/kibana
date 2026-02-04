/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Transform service map API response directly to React Flow format.
 */

import {
  SERVICE_NAME,
  AGENT_NAME,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../es_fields/apm';
import type {
  ServiceMapRawResponse,
  ServiceMapResponse,
  ConnectionNode,
  ConnectionEdge,
} from './types';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  ReactFlowServiceMapResponse,
  ServiceMapNodeData,
  ServiceNodeData,
  DependencyNodeData,
} from './react_flow_types';
import { createEdgeMarker } from './utils';
import { getPaths } from './get_paths';
import { groupReactFlowNodes } from './group_react_flow_nodes';
import {
  addMessagingConnections,
  getAllNodes,
  getAllServices,
  mapNodes,
  mapEdges,
  markBidirectionalConnections,
} from './get_service_map_nodes';
import { DEFAULT_EDGE_STYLE } from './constants';

function toServiceNodeData(node: ConnectionNode): ServiceNodeData {
  // Reuse ServiceAnomalyStats directly from the connection node
  const serviceAnomalyStats = 'serviceAnomalyStats' in node ? node.serviceAnomalyStats : undefined;

  return {
    id: node.id,
    label: node[SERVICE_NAME] || node.label || node.id,
    agentName: node[AGENT_NAME],
    isService: true,
    serviceAnomalyStats,
  };
}

function toDependencyNodeData(node: ConnectionNode): DependencyNodeData {
  return {
    id: node.id,
    label: node[SPAN_DESTINATION_SERVICE_RESOURCE] || node.label || node.id,
    spanType: node[SPAN_TYPE],
    spanSubtype: node[SPAN_SUBTYPE],
    isService: false,
  };
}

function isServiceNode(node: ConnectionNode): boolean {
  return node[SERVICE_NAME] !== undefined;
}

function toNodeData(node: ConnectionNode): ServiceMapNodeData {
  return isServiceNode(node) ? toServiceNodeData(node) : toDependencyNodeData(node);
}

function toReactFlowNode(node: ConnectionNode): ServiceMapNode {
  return {
    id: node.id,
    type: isServiceNode(node) ? 'service' : 'dependency',
    position: { x: 0, y: 0 },
    data: toNodeData(node),
  };
}

function toReactFlowEdge(edge: ConnectionEdge): ServiceMapEdge {
  const isBidirectional = edge.bidirectional ?? false;

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'default' as const,
    style: DEFAULT_EDGE_STYLE,
    markerEnd: createEdgeMarker(),
    ...(isBidirectional && { markerStart: createEdgeMarker() }),
    data: {
      isBidirectional,
      sourceData: edge.sourceData,
      targetData: edge.targetData,
      resources: edge.resources,
    },
  };
}

export function transformToReactFlow(
  data: ServiceMapResponse | ServiceMapRawResponse
): ReactFlowServiceMapResponse {
  const tracesCount = 'tracesCount' in data ? data.tracesCount : 0;

  const paths = getPaths({ spans: data.spans });

  const allConnections = addMessagingConnections(paths.connections, paths.exitSpanDestinations);
  const allNodes = getAllNodes(data.servicesData, allConnections);
  const allServices = getAllServices(allNodes, paths.exitSpanDestinations, data.anomalies);

  const mappedNodes = mapNodes({
    allConnections,
    nodes: allNodes,
    services: allServices,
    exitSpanDestinations: paths.exitSpanDestinations,
  });

  const mappedEdges = mapEdges({ allConnections, nodes: mappedNodes });

  const uniqueNodes = mappedEdges
    .flatMap((edge) => [edge.sourceData, edge.targetData])
    .concat([...allServices.values()])
    .reduce((acc, node) => {
      if (node && typeof node.id === 'string' && !acc.has(node.id)) {
        acc.set(node.id, node);
      }
      return acc;
    }, new Map<string, ConnectionNode>());

  const markedEdges = [
    ...markBidirectionalConnections({
      connections: [...mappedEdges].sort((a, b) => a.id.localeCompare(b.id)),
    }),
  ];

  const reactFlowNodes = [...uniqueNodes.values()]
    .filter((node) => !markedEdges.some((e) => e.isInverseEdge && e.target === node.id))
    .map(toReactFlowNode);

  const reactFlowEdges: ServiceMapEdge[] = [];
  for (const edge of markedEdges) {
    if (!edge.isInverseEdge) {
      reactFlowEdges.push(toReactFlowEdge(edge));
    }
  }

  const grouped = groupReactFlowNodes(reactFlowNodes, reactFlowEdges);

  return {
    nodes: grouped.nodes,
    edges: grouped.edges,
    nodesCount: grouped.nodesCount,
    tracesCount,
  };
}
