/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge, MarkerType } from '@xyflow/react';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE } from '@kbn/apm-types';
import type { ServiceAnomalyStats } from '../anomaly_detection';

/**
 * Node types for React Flow service map (used as React Flow node type)
 */
export type ServiceMapNodeType = 'service' | 'dependency' | 'groupedResources';

/**
 * Base data for all node types
 */
interface BaseNodeData extends Record<string, unknown> {
  id: string;
  label: string;
}

/**
 * Data for service nodes
 */
export interface ServiceNodeData extends BaseNodeData {
  isService: true;
  agentName?: AgentName;
  serviceAnomalyStats?: ServiceAnomalyStats;
}

/**
 * Data for dependency/external nodes
 */
export interface DependencyNodeData extends BaseNodeData {
  isService: false;
  spanType?: string;
  spanSubtype?: string;
}

/**
 * Grouped connection info
 */
export interface GroupedConnectionInfo {
  id: string;
  label: string;
  spanType?: string;
  spanSubtype?: string;
}

/**
 * Group info
 */
export interface GroupInfo {
  id: string;
  sources: string[];
  targets: string[];
}

/**
 * Data for grouped resource nodes
 */
export interface GroupedNodeData extends BaseNodeData {
  isService: false;
  isGrouped: true;
  spanType?: string;
  spanSubtype?: string;
  groupedConnections: GroupedConnectionInfo[];
  count: number;
}

/**
 * Result of grouping React Flow nodes
 */
export interface GroupReactFlowNodesResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
}

/**
 * Union type for all node data types
 */
export type ServiceMapNodeData = ServiceNodeData | DependencyNodeData | GroupedNodeData;

/**
 * React Flow node with service map data
 */
export type ServiceMapNode = Node<ServiceMapNodeData>;

/**
 * Edge marker configuration
 */
export interface EdgeMarker {
  type: MarkerType;
  width: number;
  height: number;
  color: string;
}

/**
 * Source data for edge popover (matches ConnectionNode structure)
 */
export interface EdgeSourceData extends Record<string, unknown> {
  id: string;
  [SERVICE_NAME]?: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]?: string;
}

/**
 * Data for edges in the React Flow service map
 */
export interface ServiceMapEdgeData extends Record<string, unknown> {
  isBidirectional: boolean;
  sourceData?: EdgeSourceData;
  targetData?: EdgeSourceData;
  resources?: string[];
}

/**
 * React Flow edge with service map data
 */
export interface ServiceMapEdge extends Edge<ServiceMapEdgeData> {
  type: 'default';
  style: {
    stroke: string;
    strokeWidth: number;
  };
  markerEnd: EdgeMarker;
  markerStart?: EdgeMarker;
}

/**
 * Response format for React Flow service map
 */
export interface ReactFlowServiceMapResponse {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
  tracesCount: number;
}

/**
 * Helper to check if a node is a service node
 */
export function isServiceNode(node: ServiceMapNode): node is Node<ServiceNodeData> {
  return node.data.isService === true;
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
 * Type guard to check if node data is service node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export function isServiceNodeData(data: ServiceMapNodeData): data is ServiceNodeData {
  return data.isService === true;
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
