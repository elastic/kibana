import type { ServiceAnomaliesResponse } from '@kbn/apm-types';
import type { ExitSpanDestination, ServicesResponse } from './types';
import type { Connection, ConnectionNode, ServiceConnectionNode, ExternalConnectionNode, ConnectionEdge } from './types';
export declare const isMessagingExitSpan: (node?: ConnectionNode) => node is ExternalConnectionNode;
export declare function addMessagingConnections(connections: Connection[], destinationServices: ExitSpanDestination[]): Connection[];
export declare function getAllNodes(services: ServicesResponse[], connections: Connection[]): Map<string, ConnectionNode>;
export declare function getAllServices(allNodes: Map<string, ConnectionNode>, destinationServices: ExitSpanDestination[], anomalies: ServiceAnomaliesResponse): Map<string, ServiceConnectionNode>;
export declare function getExitSpans(allNodes: Map<string, ConnectionNode>): Map<string, ExternalConnectionNode[]>;
export declare function exitSpanDestinationsToMap(destinationServices: ExitSpanDestination[]): Map<string, ServiceConnectionNode>;
export declare function mapNodes({ allConnections, nodes, exitSpanDestinations, services, }: {
    allConnections: Connection[];
    nodes: Map<string, ConnectionNode>;
    services: Map<string, ServiceConnectionNode>;
    exitSpanDestinations: ExitSpanDestination[];
}): Map<string, ConnectionNode>;
export declare function mapEdges({ allConnections, nodes, }: {
    allConnections: Connection[];
    nodes: Map<string, ConnectionNode>;
}): ConnectionEdge[];
export declare function markBidirectionalConnections({ connections }: {
    connections: ConnectionEdge[];
}): MapIterator<ConnectionEdge>;
