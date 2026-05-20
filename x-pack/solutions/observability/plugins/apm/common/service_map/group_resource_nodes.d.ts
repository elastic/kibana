import type { ServiceMapNode, ServiceMapEdge, GroupResourceNodesResult } from './types';
/**
 * Groups nodes that share the same sources.
 * Nodes with 4+ targets from the same source(s) are grouped into a single node.
 *
 * This is a native ReactFlow implementation that doesn't require
 * grouping.
 */
export declare function groupResourceNodes(nodes: ServiceMapNode[], edges: ServiceMapEdge[]): GroupResourceNodesResult;
