/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Groups React Flow nodes directly without Cytoscape intermediate format.
 * This is a React Flow native implementation of resource node grouping.
 */

import { i18n } from '@kbn/i18n';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  GroupedNodeData,
  DependencyNodeData,
} from './react_flow_types';
import { isSpanGroupingSupported, getEdgeId, createEdgeMarker } from './utils';
import { MINIMUM_GROUP_SIZE, DEFAULT_EDGE_STYLE } from './constants';

interface GroupInfo {
  id: string;
  sources: string[];
  targets: string[];
}

/**
 * Check if a node is eligible for grouping (external dependency with supported span type)
 */
function isGroupableNode(node: ServiceMapNode): boolean {
  const data = node.data;
  if (data.isService) return false;

  const spanType = 'spanType' in data ? data.spanType : undefined;
  const spanSubtype = 'spanSubtype' in data ? data.spanSubtype : undefined;

  return isSpanGroupingSupported(spanType, spanSubtype);
}

/**
 * Find groups of nodes that share the same sources and have 4+ targets
 */
function findGroups(nodes: ServiceMapNode[], edges: ServiceMapEdge[]): GroupInfo[] {
  const groupableNodeIds = new Set(nodes.filter(isGroupableNode).map((n) => n.id));

  // Build target -> sources mapping
  const sourcesByTarget = new Map<string, string[]>();
  for (const edge of edges) {
    if (groupableNodeIds.has(edge.target)) {
      const sources = sourcesByTarget.get(edge.target) ?? [];
      sources.push(edge.source);
      sourcesByTarget.set(edge.target, sources);
    }
  }

  // Group by same sources
  const groups = new Map<string, GroupInfo>();
  for (const [target, sources] of sourcesByTarget) {
    const groupId = `resourceGroup{${[...sources].sort().join(';')}}`;
    const group = groups.get(groupId) ?? { id: groupId, sources, targets: [] };
    group.targets.push(target);
    groups.set(groupId, group);
  }

  // Only keep groups with 4+ targets
  return [...groups.values()].filter((g) => g.targets.length >= MINIMUM_GROUP_SIZE);
}

/**
 * Create a grouped node from a group of nodes
 */
function createGroupedNode(
  group: GroupInfo,
  nodesById: Map<string, ServiceMapNode>
): ServiceMapNode {
  const firstTarget = nodesById.get(group.targets[0]);
  const firstData = firstTarget?.data as DependencyNodeData | undefined;

  const groupedConnections = group.targets
    .map((targetId) => {
      const node = nodesById.get(targetId);
      if (!node) return undefined;
      const data = node.data as DependencyNodeData;
      return {
        id: data.id,
        label: data.label,
        spanType: data.spanType,
        spanSubtype: data.spanSubtype,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const groupedData: GroupedNodeData = {
    id: group.id,
    label: i18n.translate('xpack.apm.serviceMap.resourceCountLabel', {
      defaultMessage: '{count} resources',
      values: { count: group.targets.length },
    }),
    isService: false,
    isGrouped: true,
    spanType: firstData?.spanType,
    spanSubtype: firstData?.spanSubtype,
    groupedConnections,
    count: group.targets.length,
  };

  return {
    id: group.id,
    type: 'groupedResources',
    position: { x: 0, y: 0 },
    data: groupedData,
  };
}

/**
 * Create edges from sources to a grouped node
 */
function createGroupedEdges(group: GroupInfo): ServiceMapEdge[] {
  return group.sources.map((source) => ({
    id: `${source}~>${group.id}`,
    source,
    target: group.id,
    type: 'default' as const,
    style: DEFAULT_EDGE_STYLE,
    markerEnd: createEdgeMarker(),
    data: { isBidirectional: false },
  }));
}

export interface GroupReactFlowNodesResult {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
  nodesCount: number;
}

/**
 * Groups React Flow nodes that share the same sources.
 * Nodes with 4+ targets from the same source(s) are grouped into a single node.
 *
 * This is a React Flow native implementation that doesn't require
 * conversion to/from Cytoscape format.
 */
export function groupReactFlowNodes(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[]
): GroupReactFlowNodesResult {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  const groups = findGroups(nodes, edges);

  // Collect IDs of nodes/edges that will be grouped
  const groupedNodeIds = new Set<string>();
  const groupedEdgeIds = new Set<string>();

  for (const group of groups) {
    for (const target of group.targets) {
      groupedNodeIds.add(target);
      for (const source of group.sources) {
        groupedEdgeIds.add(getEdgeId(source, target));
      }
    }
  }

  // Keep ungrouped nodes and edges
  const ungroupedNodes = nodes.filter((n) => !groupedNodeIds.has(n.id));
  const ungroupedEdges = edges.filter((e) => !groupedEdgeIds.has(getEdgeId(e.source, e.target)));

  // Create grouped nodes and edges
  const groupedNodes = groups.map((g) => createGroupedNode(g, nodesById));
  const groupedEdges = groups.flatMap((g) => createGroupedEdges(g));

  return {
    nodes: [...ungroupedNodes, ...groupedNodes],
    edges: [...ungroupedEdges, ...groupedEdges],
    nodesCount: ungroupedNodes.length,
  };
}
