/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge, EdgeMarker as ReactFlowEdgeMarker } from '@xyflow/react';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '@kbn/apm-types';
import type { SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_SUBTYPE, SPAN_TYPE } from '@kbn/apm-types';
import type { ServiceAnomaliesResponse } from '../../server/routes/service_map/get_service_anomalies';
import type { Coordinate } from '../../typings/timeseries';
import type { ServiceAnomalyStats } from '../anomaly_detection';

export interface ServiceMapTelemetry {
  tracesCount: number;
  nodesCount: number;
}

export type GroupedConnection = { label: string } & (ConnectionNode | ConnectionEdge);

export interface GroupedNode {
  data: {
    id: string;
    'span.type': string;
    'span.subtype'?: string;
    label: string;
    groupedConnections: GroupedConnection[];
  };
}

export interface GroupedEdge {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

export interface GroupResourceNodesResponse extends Pick<ServiceMapTelemetry, 'nodesCount'> {
  elements: Array<GroupedNode | GroupedEdge | ConnectionElement>;
}

export type ConnectionType = Connection | ConnectionLegacy;
export type DestinationType = ExitSpanDestination | ExitSpanDestinationLegacy;

export interface ServiceMapConnections {
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
  connections: Connection[];
  exitSpanDestinations: ExitSpanDestination[];
}

export interface ServiceMapRawResponse {
  spans: ServiceMapSpan[];
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
}

export type ServiceMapResponse = Pick<ServiceMapTelemetry, 'tracesCount'> & ServiceMapRawResponse;

export interface ServicesResponse {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: string;
  [SERVICE_ENVIRONMENT]: string | null;
}

export interface ServiceConnectionNode extends ServicesResponse {
  id: string;
  serviceAnomalyStats?: ServiceAnomalyStats;
  label?: string;
}

export interface ExternalConnectionNode {
  id: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
  label?: string;
}

export type ConnectionNode = ServiceConnectionNode | ExternalConnectionNode;
export type ConnectionNodeLegacy =
  | Omit<ServiceConnectionNode, 'id'>
  | Omit<ExternalConnectionNode, 'id'>;

export interface ConnectionEdge {
  id: string;
  source: ConnectionNode['id'];
  target: ConnectionNode['id'];
  label?: string;
  bidirectional?: boolean;
  isInverseEdge?: boolean;
  resources?: string[];
  sourceData?: ConnectionNode;
  targetData?: ConnectionNode;
  /** Display-ready target and source node names (e.g. without leading ">" for dependencies). */
  sourceLabel?: string;
  targetLabel?: string;
}

export type NodeItem = {
  id: string;
} & ConnectionNode;

export interface ConnectionElement {
  data: ConnectionNode | ConnectionEdge;
}

export interface Connection {
  source: ConnectionNode;
  destination: ConnectionNode;
}
export interface ConnectionLegacy {
  source: ConnectionNodeLegacy;
  destination: ConnectionNodeLegacy;
}

export interface NodeStats {
  transactionStats?: {
    latency?: {
      value: number | null;
      timeseries?: Coordinate[];
    };
    throughput?: {
      value: number | null;
      timeseries?: Coordinate[];
    };
  };
  failedTransactionsRate?: {
    value: number | null;
    timeseries?: Coordinate[];
  };
  cpuUsage?: {
    value?: number | null;
    timeseries?: Coordinate[];
  };
  memoryUsage?: {
    value?: number | null;
    timeseries?: Coordinate[];
  };
}

export type ExitSpanDestinationType = ExitSpanDestination | ExitSpanDestinationLegacy;
export interface ExitSpanDestination {
  from: ExternalConnectionNode;
  to: ServiceConnectionNode;
}

export interface ExitSpanDestinationLegacy {
  from: Omit<ExternalConnectionNode, 'id'>;
  to: Omit<ServiceConnectionNode, 'id'>;
}

export interface ServiceMapService {
  serviceName: string;
  agentName: AgentName;
  serviceEnvironment?: string;
  serviceNodeName?: string;
}

export interface ServiceMapExitSpan extends ServiceMapService {
  spanId: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
}

export type ServiceMapSpan = ServiceMapExitSpan & {
  destinationService?: ServiceMapService;
};
interface BaseNodeData extends Record<string, unknown> {
  id: string;
  label: string;
}

export interface ServiceNodeData extends BaseNodeData {
  isService: true;
  agentName?: AgentName;
  serviceAnomalyStats?: ServiceAnomalyStats;
}

export interface DependencyNodeData extends BaseNodeData {
  isService: false;
  spanType?: string;
  spanSubtype?: string;
  [SPAN_TYPE]?: string;
  [SPAN_SUBTYPE]?: string;
}

export interface GroupedConnectionInfo {
  id: string;
  label: string;
  spanType?: string;
  spanSubtype?: string;
  [SPAN_TYPE]?: string;
  [SPAN_SUBTYPE]?: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]?: string;
}

/**
 * Group info
 */
export interface GroupInfo {
  id: string;
  sources: string[];
  targets: string[];
}

export interface GroupedNodeData extends BaseNodeData {
  isService: false;
  isGrouped: true;
  spanType?: string;
  spanSubtype?: string;
  groupedConnections: GroupedConnectionInfo[];
  count: number;
}

export type ServiceMapNodeData = ServiceNodeData | DependencyNodeData | GroupedNodeData;

export type ServiceMapNode = Node<ServiceMapNodeData>;

export interface EdgeMarker extends ReactFlowEdgeMarker {
  width: number;
  height: number;
  color: string;
}

export interface ServiceMapEdgeData extends Record<string, unknown> {
  isBidirectional: boolean;
  sourceData?: ConnectionNode;
  targetData?: ConnectionNode;
  /** Display-ready source node name for titles/aria. */
  sourceLabel?: string;
  /** Display-ready target node name for titles/aria. */
  targetLabel?: string;
  resources?: string[];
}

export interface ServiceMapEdge extends Edge<ServiceMapEdgeData> {
  type: 'default';
  style: {
    stroke: string;
    strokeWidth: number;
  };
  markerEnd: EdgeMarker;
  markerStart?: EdgeMarker;
}

export interface GroupResourceNodesResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
}

export interface ReactFlowServiceMapResponse {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
  tracesCount: number;
}

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
