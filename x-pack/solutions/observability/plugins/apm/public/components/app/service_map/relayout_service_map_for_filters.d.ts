import { type ServiceMapViewFilters } from './apply_service_map_visibility';
import type { ServiceMapEdge, ServiceMapNode } from '../../../../common/service_map';
/**
 * After the full graph is laid out, filters may hide nodes while leaving the rest at their
 * **global** positions—so two visible but disconnected services stay far apart. When any
 * node is hidden, re-run Dagre on the **visible** subgraph so remaining nodes are laid out
 * together (same behavior as when the subgraph is the full map and no filter is active).
 */
export declare function applyServiceMapRelayoutForFilteredView(nodesFromFullMapLayout: ServiceMapNode[], mapEdges: ServiceMapEdge[], viewFilters: ServiceMapViewFilters, mapOrientation: 'horizontal' | 'vertical', onDagreLayoutFailure?: (error: unknown) => void): {
    nodes: ServiceMapNode[];
    edges: ServiceMapEdge[];
};
