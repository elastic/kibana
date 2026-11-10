/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';

export const EDGE_HOVERED_CLASS = 'impactMapEdgeHovered';
export const EDGE_DIMMED_CLASS = 'impactMapEdgeDimmed';
export const NODE_ENDPOINT_CLASS = 'impactMapNodeEndpoint';
export const NODE_DIMMED_CLASS = 'impactMapNodeDimmed';

const withClass = (current: string | undefined, extra: string): string =>
  [current, extra].filter(Boolean).join(' ');

/**
 * When an edge is hovered, that path stays bright and the rest fade. Nodes are left untouched —
 * rewriting the node list on hover made React Flow remeasure nested groups and the camera jumped.
 * Stroke width stays put so the hit target does not slide out from under the pointer onto a
 * crossing edge.
 */
export const applyEdgeHoverHighlight = <N extends Node, E extends Edge>(
  nodes: N[],
  edges: E[],
  hoveredEdgeId: string | null
): { nodes: N[]; edges: E[]; endpointIds: Set<string> } => {
  if (!hoveredEdgeId) {
    return { nodes, edges, endpointIds: new Set() };
  }
  const hovered = edges.find(({ id }) => id === hoveredEdgeId);
  if (!hovered) {
    return { nodes, edges, endpointIds: new Set() };
  }

  const endpointIds = new Set([hovered.source, hovered.target]);
  const nextEdges = edges.map((edge) => {
    if (edge.id === hoveredEdgeId) {
      return {
        ...edge,
        className: withClass(edge.className, EDGE_HOVERED_CLASS),
        zIndex: 1000,
        style: {
          ...edge.style,
          opacity: 1,
        },
        data: { ...edge.data, hover: 'highlighted' as const },
      };
    }
    return {
      ...edge,
      className: withClass(edge.className, EDGE_DIMMED_CLASS),
      zIndex: 0,
      style: {
        ...edge.style,
        opacity: 0.15,
      },
      data: { ...edge.data, hover: 'dimmed' as const },
    };
  });

  return { nodes, edges: nextEdges, endpointIds };
};
