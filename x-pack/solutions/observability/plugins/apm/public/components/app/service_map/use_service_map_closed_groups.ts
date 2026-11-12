/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  groupServiceNodes,
  isServiceGroupNode,
  isServiceNodeData,
  type ServiceMapEdge,
  type ServiceMapGrouping,
  type ServiceMapNode,
} from '../../../../common/service_map';
import { useServiceMapGroupingEnabled } from '../../../hooks/use_service_map_grouping_enabled';
import { buildMockServiceGrouping } from './mock_service_grouping';
import { formatServiceGroupingCountLine } from './format_service_grouping_count_line';

export interface UseServiceMapClosedGroupsResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  countLine?: string;
}

/**
 * After badge merge: collapse groups of 2+ using API `serviceGrouping`, or a local
 * name-prefix mock when the flag is on and the URL has `serviceMapMockGrouping=1`.
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
  const { search } = useLocation();
  // Local-only preview until #300584 returns serviceGrouping.
  const mockFromUrl = new URLSearchParams(search).get('serviceMapMockGrouping') === '1';

  return useMemo(() => {
    if (!isGroupingEnabled) {
      return { nodes, edges };
    }

    const grouping =
      serviceGrouping ??
      (mockFromUrl
        ? buildMockServiceGrouping(
            nodes.filter((n) => isServiceNodeData(n.data)).map((n) => n.data.label)
          )
        : undefined);

    if (!grouping) {
      return { nodes, edges };
    }

    const grouped = groupServiceNodes(nodes, edges, grouping);
    const closedGroupCount = grouped.nodes.filter((node) => isServiceGroupNode(node)).length;
    return {
      nodes: grouped.nodes,
      edges: grouped.edges,
      countLine: formatServiceGroupingCountLine(grouping, closedGroupCount),
    };
  }, [nodes, edges, serviceGrouping, isGroupingEnabled, mockFromUrl]);
}
