export type { ServiceMapTelemetry, GroupedConnection, GroupedNode, GroupedEdge, GroupResourceNodesResponse, ConnectionType, DestinationType, ServiceMapRawResponse, ServiceMapResponse, ServicesResponse, ServiceConnectionNode, ExternalConnectionNode, ConnectionNode, ConnectionNodeLegacy, ConnectionEdge, NodeItem, ConnectionElement, Connection, ConnectionLegacy, NodeStats, ExitSpanDestination, ExitSpanDestinationLegacy, ServiceMapService, ServiceMapExitSpan, ServiceMapSpan, ServiceNodeData, DependencyNodeData, GroupedConnectionInfo, GroupInfo, GroupedNodeData, ServiceMapNodeData, ServiceMapNode, EdgeMarker, ServiceMapEdgeData, ServiceMapEdge, GroupResourceNodesResult, ReactFlowServiceMapResponse, } from '@kbn/apm-types';
import type { ServiceMapNode, ServiceNodeData, DependencyNodeData, GroupedNodeData, ServiceMapNodeData } from '@kbn/apm-types';
import type { Node } from '@xyflow/react';
/**
 * Type guard to check if node data is service node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export declare function isServiceNodeData(data: ServiceMapNodeData): data is ServiceNodeData;
/**
 * Helper to check if a node is a service node (delegates to isServiceNodeData).
 */
export declare function isServiceNode(node: ServiceMapNode): node is Node<ServiceNodeData>;
/**
 * Helper to check if a node is an external/dependency node
 */
export declare function isExternalNode(node: ServiceMapNode): node is Node<DependencyNodeData>;
/**
 * Helper to check if a node is a grouped resources node
 */
export declare function isGroupedNode(node: ServiceMapNode): node is Node<GroupedNodeData>;
/**
 * Type guard to check if node data is grouped node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export declare function isGroupedNodeData(data: ServiceMapNodeData): data is GroupedNodeData;
/**
 * Type guard to check if node data is dependency/external node data.
 * Use this when you have the data object directly (e.g., after accessing node.data).
 */
export declare function isDependencyNodeData(data: ServiceMapNodeData): data is DependencyNodeData;
