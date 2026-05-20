import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
type ArrowDirection = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';
interface UseKeyboardNavigationOptions {
    nodes: ServiceMapNode[];
    edges: ServiceMapEdge[];
    selectedNodeId: string | null;
    selectedNodeForPopover: ServiceMapNode | null;
    selectedEdgeForPopover: ServiceMapEdge | null;
    onNodeSelect: (node: ServiceMapNode | null) => void;
    onEdgeSelect: (edge: ServiceMapEdge | null) => void;
    onPopoverClose: () => void;
}
interface UseKeyboardNavigationResult {
    screenReaderAnnouncement: string;
    findNodeInDirection: (currentNodeId: string, direction: ArrowDirection) => ServiceMapNode | null;
}
/**
 * Hook that provides keyboard navigation for the service map.
 *
 * Supports:
 * - Arrow keys: Spatial navigation between nodes
 * - Enter/Space: Open popover for focused node
 * - Escape: Close popover
 *
 * Also manages screen reader announcements for navigation events.
 */
export declare function useKeyboardNavigation({ nodes, edges, selectedNodeId, selectedNodeForPopover, selectedEdgeForPopover, onNodeSelect, onEdgeSelect, onPopoverClose, }: UseKeyboardNavigationOptions): UseKeyboardNavigationResult;
export {};
