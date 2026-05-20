/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ServiceMapTelemetry,
  GroupedConnection,
  GroupedNode,
  GroupedEdge,
  GroupResourceNodesResponse,
  ConnectionType,
  DestinationType,
  ServiceMapRawResponse,
  ServiceMapResponse,
  ServicesResponse,
  ServiceConnectionNode,
  ExternalConnectionNode,
  ConnectionNode,
  ConnectionNodeLegacy,
  ConnectionEdge,
  NodeItem,
  ConnectionElement,
  Connection,
  ConnectionLegacy,
  NodeStats,
  ExitSpanDestination,
  ExitSpanDestinationLegacy,
  ServiceMapService,
  ServiceMapExitSpan,
  ServiceMapSpan,
  ServiceNodeData,
  DependencyNodeData,
  GroupedConnectionInfo,
  GroupInfo,
  GroupedNodeData,
  ServiceMapNodeData,
  ServiceMapNode,
  EdgeMarker,
  ServiceMapEdgeData,
  ServiceMapEdge,
  GroupResourceNodesResult,
  ReactFlowServiceMapResponse,
} from '@kbn/apm-types';
import type {
  ServiceMapNode,
  ServiceNodeData,
  DependencyNodeData,
  GroupedNodeData,
  ServiceMapNodeData,
} from '@kbn/apm-types';
import type { Node } from '@xyflow/react';

/**
 * Type guard to check if node data is service node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export function isServiceNodeData(data: ServiceMapNodeData): data is ServiceNodeData {
  return data.isService === true;
}

/**
 * Helper to check if a node is a service node (delegates to isServiceNodeData).
 */
export function isServiceNode(node: ServiceMapNode): node is Node<ServiceNodeData> {
  return isServiceNodeData(node.data);
}

/**
 * Helper to check if a node is an external/dependency node
 */
export function isExternalNode(node: ServiceMapNode): node is Node<DependencyNodeData> {
  return node.data.isService === false && !('isGrouped' in node.data);
}

/**
 * Helper to check if a node is a grouped resources node
 */
export function isGroupedNode(node: ServiceMapNode): node is Node<GroupedNodeData> {
  return 'isGrouped' in node.data && node.data.isGrouped === true;
}

/**
 * Type guard to check if node data is grouped node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export function isGroupedNodeData(data: ServiceMapNodeData): data is GroupedNodeData {
  return 'isGrouped' in data && data.isGrouped === true;
}

/**
 * Type guard to check if node data is dependency/external node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export function isDependencyNodeData(data: ServiceMapNodeData): data is DependencyNodeData {
  return data.isService === false && !('isGrouped' in data);
}
