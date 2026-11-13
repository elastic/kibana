/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  groupServiceNodes,
  isServiceGroupNode,
  type ServiceMapEdge,
  type ServiceMapGrouping,
  type ServiceMapNode,
} from '../../../../common/service_map';
import { useServiceMapGroupingEnabled } from '../../../hooks/use_service_map_grouping_enabled';
import { formatServiceGroupingCountLine } from './format_service_grouping_count_line';

export interface UseServiceMapClosedGroupsResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  countLine?: string;
}

/**
 * After badge merge: collapse groups of 2+ using API `serviceGrouping`.
 * No grouping (flag off, or response omitted) → unchanged map.
 */
export function useServiceMapClosedGroups({
  nodes,
  edges,
  serviceGrouping,
}: {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  serviceGrouping?: ServiceMapGrouping;
}): UseServiceMapClosedGroupsResult {
  const isGroupingEnabled = useServiceMapGroupingEnabled();

  return useMemo(() => {
    if (!isGroupingEnabled || !serviceGrouping) {
      return { nodes, edges };
    }

    const grouped = groupServiceNodes(nodes, edges, serviceGrouping);
    const closedGroupCount = grouped.nodes.filter((node) => isServiceGroupNode(node)).length;
    return {
      nodes: grouped.nodes,
      edges: grouped.edges,
      // No squares drawn → no count line (avoids "N services in 0 groups").
      countLine:
        closedGroupCount > 0
          ? formatServiceGroupingCountLine(serviceGrouping, closedGroupCount)
          : undefined,
    };
  }, [nodes, edges, serviceGrouping, isGroupingEnabled]);
}
