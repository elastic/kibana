/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  RANK_SEPARATION,
  NODE_SEPARATION,
  GRAPH_MARGIN,
} from './constants';

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

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  rankdir: 'LR',
  ranksep: RANK_SEPARATION,
  nodesep: NODE_SEPARATION,
  marginx: GRAPH_MARGIN,
  marginy: GRAPH_MARGIN,
  nodeWidth: NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
};

/**
 * Places nodes on a square grid when Dagre layout fails (e.g. rare internal dagre bugs).
 * Positions follow the **input array order** (index 0, 1, …), not graph topology—only
 * a last-resort layout so the map stays usable.
 */
export function applyGridFallbackLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  opts: Required<LayoutOptions>
): Node<T>[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      position: {
        x: Math.round(opts.marginx + col * (opts.nodeWidth + opts.nodesep)),
        y: Math.round(opts.marginy + row * (opts.nodeHeight + opts.ranksep)),
      },
    };
  });
}

/**
 * Apply dagre layout to position nodes in a hierarchical layout.
 *
 * @param nodes - Array of React Flow nodes to position
 * @param edges - Array of React Flow edges defining connections
 * @param options - Optional layout configuration
 * @param onDagreLayoutFailure - Optional callback when Dagre throws (e.g. for telemetry)
 * @returns Array of nodes with calculated positions
 */
export function applyDagreLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: LayoutOptions = {},
  onDagreLayoutFailure?: (error: unknown) => void
): Node<T>[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: opts.rankdir,
      ranksep: opts.ranksep,
      nodesep: opts.nodesep,
      marginx: opts.marginx,
      marginy: opts.marginy,
    })
    .setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  try {
    Dagre.layout(g);
  } catch (error) {
    onDagreLayoutFailure?.(error);
    return applyGridFallbackLayout(nodes, opts);
  }

  // Apply calculated positions to nodes
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);

    if (!dagreNode) {
      return node;
    }

    return {
      ...node,
      position: {
        x: Math.round(dagreNode.x - opts.nodeWidth / 2),
        y: Math.round(dagreNode.y - opts.nodeHeight / 2),
      },
    };
  });
}
