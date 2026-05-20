import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import type { ServiceMapViewFilters } from './apply_service_map_visibility';
import { type ServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
interface UseServiceMapFilterStateParams {
    layoutedNodes: ServiceMapNode[];
    initialNodes: ServiceMapNode[];
    initialEdges: ServiceMapEdge[];
    viewFilters: ServiceMapViewFilters;
    mapOrientation: 'horizontal' | 'vertical';
    onDagreLayoutFailure?: (error: unknown) => void;
}
interface UseServiceMapFilterStateResult {
    filterOptionCounts: ServiceMapFilterOptionCounts;
    nodesAfterFilters: ServiceMapNode[];
    edgesAfterFilters: ServiceMapEdge[];
}
export declare function useServiceMapFilterState({ layoutedNodes, initialNodes, initialEdges, viewFilters, mapOrientation, onDagreLayoutFailure, }: UseServiceMapFilterStateParams): UseServiceMapFilterStateResult;
export {};
