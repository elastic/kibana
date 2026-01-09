/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { ServiceMapNodeData } from './service_node';
import type { ServiceMapEdgeData } from './transform_data';

// Node dimension constants
const SERVICE_NODE_SIZE = 100;
const DEPENDENCY_NODE_SIZE = 80;

export interface LayoutOptions {
  /** Direction of the graph layout */
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Separation between nodes at the same rank */
  nodesep?: number;
  /** Separation between ranks */
  ranksep?: number;
  /** Horizontal margin */
  marginx?: number;
  /** Vertical margin */
  marginy?: number;
}

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  rankdir: 'LR',
  nodesep: 80,
  ranksep: 120,
  marginx: 50,
  marginy: 50,
};

/**
 * Get the dimensions for a node based on its type
 */
function getNodeDimensions(isService: boolean): { width: number; height: number } {
  const size = isService ? SERVICE_NODE_SIZE : DEPENDENCY_NODE_SIZE;
  return { width: size, height: size };
}

/**
 * Apply Dagre layout to position nodes in a left-to-right directed graph
 * Similar to the Cytoscape version's layout algorithm
 */
export function applyLayout(
  nodes: Node<ServiceMapNodeData>[],
  edges: Edge<ServiceMapEdgeData>[],
  options: LayoutOptions = {}
): { nodes: Node<ServiceMapNodeData>[]; edges: Edge<ServiceMapEdgeData>[] } {
  if (nodes.length === 0) return { nodes, edges };

  const layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph(layoutOptions);

  // Pre-compute and cache node dimensions to avoid duplicate calculations
  const nodeDimensions = new Map<string, { width: number; height: number }>();

  // Add nodes to the graph with their dimensions
  for (const node of nodes) {
    const dimensions = getNodeDimensions(node.data.isService);
    nodeDimensions.set(node.id, dimensions);
    g.setNode(node.id, dimensions);
  }

  // Add edges to the graph
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run the layout algorithm
  dagre.layout(g);

  // Apply the calculated positions to the nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const dimensions = nodeDimensions.get(node.id)!;

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dimensions.width / 2,
        y: nodeWithPosition.y - dimensions.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
