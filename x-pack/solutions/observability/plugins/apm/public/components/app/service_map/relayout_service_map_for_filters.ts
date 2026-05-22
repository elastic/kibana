/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDagreLayout } from '../../shared/service_map/layout';
import {
  applyServiceMapVisibility,
  type ServiceMapViewFilters,
} from './apply_service_map_visibility';
import type { ServiceMapEdge, ServiceMapNode } from '../../../../common/service_map';

/**
 * After the full graph is laid out, filters may hide nodes while leaving the rest at their
 * **global** positions—so two visible but disconnected services stay far apart. When any
 * node is hidden, re-run Dagre on the **visible** subgraph so remaining nodes are laid out
 * together (same behavior as when the subgraph is the full map and no filter is active).
 */
export function applyServiceMapRelayoutForFilteredView(
  nodesFromFullMapLayout: ServiceMapNode[],
  mapEdges: ServiceMapEdge[],
  viewFilters: ServiceMapViewFilters,
  mapOrientation: 'horizontal' | 'vertical',
  onDagreLayoutFailure?: (error: unknown) => void
): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  const visibilityResult = applyServiceMapVisibility(nodesFromFullMapLayout, mapEdges, viewFilters);
  const hasHiddenNodes = visibilityResult.nodes.some((node) => node.hidden);
  if (!hasHiddenNodes) {
    return visibilityResult;
  }

  const visibleNodesOnly = visibilityResult.nodes.filter((node) => !node.hidden);
  const visibleEdgesOnly = visibilityResult.edges.filter((edge) => !edge.hidden);

  if (visibleNodesOnly.length === 0) {
    return visibilityResult;
  }

  const subgraphLaidOutNodes = applyDagreLayout(
    visibleNodesOnly,
    visibleEdgesOnly,
    {
      rankdir: mapOrientation === 'vertical' ? 'TB' : 'LR',
    },
    onDagreLayoutFailure
  );

  const subgraphNodeById = new Map(subgraphLaidOutNodes.map((node) => [node.id, node] as const));

  const nodesWithSubgraphLayout = visibilityResult.nodes.map((node) => {
    if (node.hidden) {
      return node;
    }
    const updatedFromSubgraph = subgraphNodeById.get(node.id);
    return updatedFromSubgraph ? { ...node, ...updatedFromSubgraph } : node;
  });

  return { nodes: nodesWithSubgraphLayout, edges: visibilityResult.edges };
}
