import { type Node, type Edge } from '@xyflow/react';
export interface LayoutOptions {
    /** Direction of the graph layout */
    rankdir?: 'TB' | 'LR';
    /** Vertical spacing between ranks */
    ranksep?: number;
    /** Horizontal spacing between nodes */
    nodesep?: number;
    /** Margin around the graph */
    marginx?: number;
    marginy?: number;
    /** Width of nodes */
    nodeWidth?: number;
    /** Height of nodes */
    nodeHeight?: number;
}
/**
 * Places nodes on a square grid when Dagre layout fails (e.g. rare internal dagre bugs).
 * Positions follow the **input array order** (index 0, 1, …), not graph topology—only
 * a last-resort layout so the map stays usable.
 */
export declare function applyGridFallbackLayout<T extends Node>(nodes: T[], opts: Required<LayoutOptions>): T[];
/**
 * Apply dagre layout to position nodes in a hierarchical layout.
 *
 * @param nodes - Array of React Flow nodes to position
 * @param edges - Array of React Flow edges defining connections
 * @param options - Optional layout configuration
 * @param onDagreLayoutFailure - Optional callback when Dagre throws (e.g. for telemetry)
 * @returns Array of nodes with calculated positions
 */
export declare function applyDagreLayout<T extends Node>(nodes: T[], edges: Edge[], options?: LayoutOptions, onDagreLayoutFailure?: (error: unknown) => void): T[];
