import type { ServiceMapEdge, EdgeMarker } from '../../../../common/service_map';
interface EdgeMarkers {
    defaultEnd: EdgeMarker;
    highlightedEnd: EdgeMarker;
    defaultStart: EdgeMarker;
    highlightedStart: EdgeMarker;
}
interface ApplyEdgeHighlightingOptions {
    selectedNodeId?: string | null;
    selectedEdgeId?: string | null;
}
interface UseEdgeHighlightingResult {
    markers: EdgeMarkers;
    applyEdgeHighlighting: (edges: ServiceMapEdge[], options: ApplyEdgeHighlightingOptions | string | null) => ServiceMapEdge[];
    colors: {
        primary: string;
        default: string;
    };
}
/**
 * Custom hook for managing edge highlighting in the service map.
 * Provides pre-computed markers and a function to apply highlighting
 * based on the selected node.
 *
 * @returns Object containing markers, applyEdgeHighlighting function, and theme colors
 */
export declare function useEdgeHighlighting(): UseEdgeHighlightingResult;
export {};
