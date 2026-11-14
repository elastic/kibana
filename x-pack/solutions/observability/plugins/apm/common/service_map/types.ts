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
  ServiceMapServiceStats,
  ServiceNodeData,
  DependencyNodeData,
  GroupedConnectionInfo,
  GroupInfo,
  GroupedNodeData,
  ServiceGroupNodeData,
  ServiceMapNodeData,
  ServiceMapNode,
  EdgeMarker,
  ServiceMapEdgeData,
  ServiceMapEdge,
  GroupResourceNodesResult,
  ReactFlowServiceMapResponse,
  ServiceGroupingSource,
  ServiceMapGroup,
  ServiceGroupingStrategy,
  ServiceMapGrouping,
} from '@kbn/apm-types';
import type {
  ServiceMapNode,
  ServiceNodeData,
  DependencyNodeData,
  GroupedNodeData,
  ServiceGroupNodeData,
  ServiceMapNodeData,
} from '@kbn/apm-types';
import type { Node } from '@xyflow/react';

/**
 * Type guard to check if node data is service node data.
 */
export function isServiceNodeData(data: ServiceMapNodeData): data is ServiceNodeData {
  return data.isService === true;
}

/**
 * Helper to check if a node is a service node.
 */
export function isServiceNode(node: ServiceMapNode): node is Node<ServiceNodeData> {
  return isServiceNodeData(node.data);
}

/**
 * Type guard for a closed service-group node (not a resource group).
 */
export function isServiceGroupNodeData(data: ServiceMapNodeData): data is ServiceGroupNodeData {
  return 'isServiceGroup' in data && data.isServiceGroup === true;
}

/**
 * Helper to check if a node is a closed service-group node.
 */
export function isServiceGroupNode(node: ServiceMapNode): node is Node<ServiceGroupNodeData> {
  return isServiceGroupNodeData(node.data);
}

/**
 * Helper to check if a node is an external/dependency node.
 */
export function isExternalNode(node: ServiceMapNode): node is Node<DependencyNodeData> {
  return isDependencyNodeData(node.data);
}

/**
 * Helper to check if a node is a grouped resources node.
 */
export function isGroupedNode(node: ServiceMapNode): node is Node<GroupedNodeData> {
  return isGroupedNodeData(node.data);
}

/**
 * Type guard to check if node data is grouped resource node data.
 */
export function isGroupedNodeData(data: ServiceMapNodeData): data is GroupedNodeData {
  return 'isGrouped' in data && data.isGrouped === true;
}

/**
 * Type guard to check if node data is dependency/external node data.
 */
export function isDependencyNodeData(data: ServiceMapNodeData): data is DependencyNodeData {
  return data.isService === false && !isGroupedNodeData(data) && !isServiceGroupNodeData(data);
}
