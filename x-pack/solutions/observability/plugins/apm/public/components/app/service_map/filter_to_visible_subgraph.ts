/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';

/**
 * Given the full graph (nodes, edges) and the set of "expanded" service IDs
 * (the ones the user has included via +), returns the subgraph that should be
 * visible: when expanded is empty, the full graph; otherwise expanded services
 * plus their direct neighbors only (one hop). That way services in the view
 * can have "hidden" connections (to nodes not in the one-hop set), so the +
 * icon appears and clicking + expands to show those connections.
 */
export function filterToVisibleSubgraph(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  expandedServiceIds: Set<string>
): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  if (expandedServiceIds.size === 0) {
    return { nodes, edges };
  }

  const visibleIds = new Set<string>(expandedServiceIds);

  // One hop only: add nodes that are directly connected to an expanded service
  for (const edge of edges) {
    if (visibleIds.has(edge.source)) {
      visibleIds.add(edge.target);
    }
    if (visibleIds.has(edge.target)) {
      visibleIds.add(edge.source);
    }
  }

  const visibleNodes = nodes.filter((n) => visibleIds.has(n.id));
  const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

  return { nodes: visibleNodes, edges: visibleEdges };
}

/**
 * Returns the set of service node IDs (from the displayed nodes) that have at least one
 * connection in the full graph to a node not in the displayed set. Only those services
 * should show the + icon (expand to reveal more connections). When the view is unfiltered
 * (all nodes displayed), the set is empty so no + icons are shown.
 */
export function getServiceIdsWithHiddenConnections(
  displayNodes: ServiceMapNode[],
  fullEdges: ServiceMapEdge[]
): Set<string> {
  const displayNodeIds = new Set(displayNodes.map((n) => n.id));
  const serviceIdsInDisplay = new Set(
    displayNodes.filter((n) => n.type === 'service').map((n) => n.id)
  );
  const withHidden = new Set<string>();

  for (const serviceId of serviceIdsInDisplay) {
    const hasHiddenConnection = fullEdges.some(
      (e) =>
        (e.source === serviceId && !displayNodeIds.has(e.target)) ||
        (e.target === serviceId && !displayNodeIds.has(e.source))
    );
    if (hasHiddenConnection) {
      withHidden.add(serviceId);
    }
  }

  return withHidden;
}
