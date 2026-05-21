/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import type { ServiceMapViewFilters } from './apply_service_map_visibility';
import { applyServiceMapRelayoutForFilteredView } from './relayout_service_map_for_filters';
import {
  computeServiceMapFilterOptionCounts,
  type ServiceMapFilterOptionCounts,
} from './service_map_filter_option_counts';

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

export function useServiceMapFilterState({
  layoutedNodes,
  initialNodes,
  initialEdges,
  viewFilters,
  mapOrientation,
  onDagreLayoutFailure,
}: UseServiceMapFilterStateParams): UseServiceMapFilterStateResult {
  const filterOptionCounts = useMemo(
    () => computeServiceMapFilterOptionCounts(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const { nodes: nodesAfterFilters, edges: edgesAfterFilters } = useMemo(
    () =>
      applyServiceMapRelayoutForFilteredView(
        layoutedNodes,
        initialEdges,
        viewFilters,
        mapOrientation,
        onDagreLayoutFailure
      ),
    [layoutedNodes, initialEdges, viewFilters, mapOrientation, onDagreLayoutFailure]
  );

  return { filterOptionCounts, nodesAfterFilters, edgesAfterFilters };
}
