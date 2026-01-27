/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Transform service map API response directly to React Flow format.
 */

import { sortBy } from 'lodash';
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
import { isExitSpan, createEdgeMarker } from './utils';
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

function toNodeData(node: ConnectionNode): ServiceMapNodeData {
  return isExitSpan(node) ? toDependencyNodeData(node) : toServiceNodeData(node);
}

function toReactFlowNode(node: ConnectionNode): ServiceMapNode {
  return {
    id: node.id,
    type: isExitSpan(node) ? 'dependency' : 'service',
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
    data: { isBidirectional },
  };
}

export function transformToReactFlow(
  data: ServiceMapResponse | ServiceMapRawResponse
): ReactFlowServiceMapResponse {
  const tracesCount = 'tracesCount' in data ? data.tracesCount : 0;

  // Step 1: Extract paths from spans
  const paths = getPaths({ spans: data.spans });

  // Step 2: Add messaging connections
  const allConnections = addMessagingConnections(paths.connections, paths.exitSpanDestinations);

  // Step 3: Get all nodes
  const allNodes = getAllNodes(data.servicesData, allConnections);

  // Step 4: Get all services with anomaly stats
  const allServices = getAllServices(allNodes, paths.exitSpanDestinations, data.anomalies);

  // Step 5: Map nodes - resolves exit spans to destinations
  const mappedNodes = mapNodes({
    allConnections,
    nodes: allNodes,
    services: allServices,
    exitSpanDestinations: paths.exitSpanDestinations,
  });

  // Step 6: Map edges
  const mappedEdges = mapEdges({ allConnections, nodes: mappedNodes });

  // Step 7: Get unique nodes from edges + standalone services
  const uniqueNodes = mappedEdges
    .flatMap((edge) => [edge.sourceData, edge.targetData])
    .concat([...allServices.values()])
    .reduce((acc, node) => {
      if (!acc.has(node.id)) {
        acc.set(node.id, node);
      }
      return acc;
    }, new Map<string, ConnectionNode>());

  // Step 8: Mark bidirectional connections
  const markedEdges = [
    ...markBidirectionalConnections({
      connections: sortBy(mappedEdges, 'id'),
    }),
  ];

  // Step 9: Convert directly to React Flow format
  const reactFlowNodes = [...uniqueNodes.values()]
    .filter((node) => !markedEdges.some((e) => e.isInverseEdge && e.target === node.id))
    .map(toReactFlowNode);

  const reactFlowEdges = markedEdges.filter((edge) => !edge.isInverseEdge).map(toReactFlowEdge);

  // Step 10: Apply grouping
  const grouped = groupReactFlowNodes(reactFlowNodes, reactFlowEdges);

  return {
    nodes: grouped.nodes,
    edges: grouped.edges,
    nodesCount: grouped.nodesCount,
    tracesCount,
  };
}
