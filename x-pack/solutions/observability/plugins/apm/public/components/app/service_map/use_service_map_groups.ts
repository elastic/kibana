/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  groupServiceNodes,
  isServiceGroupBoxNode,
  isServiceGroupNode,
  type ServiceMapEdge,
  type ServiceMapGrouping,
  type ServiceMapNode,
} from '../../../../common/service_map';
import { useServiceMapGroupingEnabled } from '../../../hooks/use_service_map_grouping_enabled';
import { formatServiceGroupingCountLine } from './format_service_grouping_count_line';

export interface UseServiceMapGroupsResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  countLine?: string;
  openGroup: (groupId: string) => void;
  closeGroup: (groupId: string) => void;
}

/**
 * After badge merge: collapse groups of 2+ using API `serviceGrouping`, except the ones the user
 * has opened, which are drawn as a box around their members.
 */
export function useServiceMapGroups({
  nodes,
  edges,
  serviceGrouping,
}: {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  serviceGrouping?: ServiceMapGrouping;
}): UseServiceMapGroupsResult {
  const isGroupingEnabled = useServiceMapGroupingEnabled();
  const [openGroupIds, setOpenGroupIds] = useState<ReadonlySet<string>>(() => new Set());

  // The same set when nothing changes, so the map is not grouped and laid out again for nothing.
  const openGroup = useCallback((groupId: string) => {
    setOpenGroupIds((previous) =>
      previous.has(groupId) ? previous : new Set(previous).add(groupId)
    );
  }, []);

  const closeGroup = useCallback((groupId: string) => {
    setOpenGroupIds((previous) => {
      if (!previous.has(groupId)) {
        return previous;
      }
      const next = new Set(previous);
      next.delete(groupId);
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    if (!isGroupingEnabled || !serviceGrouping) {
      return { nodes, edges };
    }

    // `source` is `undefined` for the automatic strategy: there is no group-by picker yet.
    const result = groupServiceNodes(nodes, edges, serviceGrouping, undefined, openGroupIds);
    // Open groups count too: they are still groups, just drawn as a box.
    const drawnGroupCount = result.nodes.filter(
      (node) => isServiceGroupNode(node) || isServiceGroupBoxNode(node)
    ).length;
    return {
      nodes: result.nodes,
      edges: result.edges,
      // No squares or boxes drawn → no count line (avoids "N services in 0 groups").
      countLine:
        drawnGroupCount > 0
          ? formatServiceGroupingCountLine(serviceGrouping, drawnGroupCount)
          : undefined,
    };
  }, [nodes, edges, serviceGrouping, isGroupingEnabled, openGroupIds]);

  return { ...grouped, openGroup, closeGroup };
}
