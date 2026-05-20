import type { Connection, ConnectionNode, ExternalConnectionNode, ServiceConnectionNode } from './types';
import type { EdgeMarker } from './types';
import type { ConnectionNodeLegacy, ServiceMapExitSpan, ServiceMapService } from './types';
export declare const invalidLicenseMessage: string;
export declare function isSpanGroupingSupported(type?: string, subtype?: string): boolean;
export declare function getConnections(paths: Array<Array<ConnectionNode | ConnectionNodeLegacy>> | undefined): Connection[];
export declare const isExitSpan: (node: ConnectionNode | ConnectionNodeLegacy) => node is ExternalConnectionNode;
export declare function getLegacyNodeId(node: ConnectionNodeLegacy): string;
export declare function getServiceConnectionNode(event: ServiceMapService): ServiceConnectionNode;
export declare function getExternalConnectionNode(event: ServiceMapExitSpan): ExternalConnectionNode;
export declare function getEdgeId(sourceId: string, destinationId: string): string;
export declare function getExitSpanNodeId(span: ExternalConnectionNode): string;
export declare function toDisplayName(id: string): string;
/**
 * Create an edge marker with the specified color
 */
export declare function createEdgeMarker(color?: string): EdgeMarker;
