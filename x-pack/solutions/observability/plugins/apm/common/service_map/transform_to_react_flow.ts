/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Transform service map API response directly to React Flow format.
 */

import type { AgentName } from '@kbn/apm-types';
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
  ServiceConnectionNode,
  ExternalConnectionNode,
} from './types';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  ReactFlowServiceMapResponse,
  ServiceMapNodeData,
  ServiceNodeData,
  DependencyNodeData,
} from './types';
import { createEdgeMarker, toDisplayName } from './utils';
import { getPaths } from './get_paths';
import { groupResourceNodes } from './group_resource_nodes';
import {
  addMessagingConnections,
  getAllNodes,
  getAllServices,
  mapNodes,
  mapEdges,
  markBidirectionalConnections,
} from './get_service_map_nodes';
import { DEFAULT_EDGE_STYLE } from './constants';

function toServiceNodeData(node: ServiceConnectionNode): ServiceNodeData {
  return {
    id: node.id,
    label: node[SERVICE_NAME] ?? node.label ?? node.id,
    agentName: node[AGENT_NAME] as AgentName,
    isService: true,
    serviceAnomalyStats: node.serviceAnomalyStats,
  };
}

function toDependencyNodeData(node: ExternalConnectionNode): DependencyNodeData {
  return {
    id: node.id,
    label: node[SPAN_DESTINATION_SERVICE_RESOURCE] ?? node.label ?? toDisplayName(node.id),
    spanType: node[SPAN_TYPE],
    spanSubtype: node[SPAN_SUBTYPE],
    isService: false,
  };
}

function isServiceNode(node: ConnectionNode): node is ServiceConnectionNode {
  return SERVICE_NAME in node && node[SERVICE_NAME] !== undefined;
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
      sourceLabel: edge.sourceLabel,
      targetLabel: edge.targetLabel,
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

  const reactFlowNodes = [...uniqueNodes.values()].map((node) => toReactFlowNode(node));

  const reactFlowEdges: ServiceMapEdge[] = [];
  for (const edge of markedEdges) {
    if (!edge.isInverseEdge) {
      reactFlowEdges.push(toReactFlowEdge(edge));
    }
  }

  const grouped = groupResourceNodes(reactFlowNodes, reactFlowEdges);

  return {
    nodes: grouped.nodes,
    edges: grouped.edges,
    nodesCount: grouped.nodesCount,
    tracesCount,
  };
}
