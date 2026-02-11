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
  GroupInfo,
  GroupReactFlowNodesResult,
} from './react_flow_types';
import { isDependencyNodeData } from './react_flow_types';
import { isSpanGroupingSupported, getEdgeId, createEdgeMarker } from './utils';
import { MINIMUM_GROUP_SIZE, DEFAULT_EDGE_STYLE } from './constants';

/**
 * Check if a node is eligible for grouping (external dependency with supported span type).
 */
function isGroupableNode(node: ServiceMapNode): boolean {
  if (!isDependencyNodeData(node.data)) return false;

  return isSpanGroupingSupported(node.data.spanType, node.data.spanSubtype);
}

/**
 * Find groups of nodes that share the same sources and have ≥ `MINIMUM_GROUP_SIZE` targets.
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

  // Only keep groups with ≥ `MINIMUM_GROUP_SIZE` targets
  return [...groups.values()].filter((g) => g.targets.length >= MINIMUM_GROUP_SIZE);
}

/**
 * Create a grouped node from a group of nodes.
 */
function createGroupedNode(
  group: GroupInfo,
  nodesById: Map<string, ServiceMapNode>
): ServiceMapNode {
  const firstTarget = nodesById.get(group.targets[0]);
  const firstData =
    firstTarget && isDependencyNodeData(firstTarget.data) ? firstTarget.data : undefined;

  const groupedConnections: GroupedNodeData['groupedConnections'] = [];
  for (const targetId of group.targets) {
    const node = nodesById.get(targetId);
    if (node && isDependencyNodeData(node.data)) {
      groupedConnections.push({
        id: node.data.id,
        label: node.data.label,
        spanType: node.data.spanType,
        spanSubtype: node.data.spanSubtype,
      });
    }
  }

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
function createIncomingGroupedEdges(group: GroupInfo): ServiceMapEdge[] {
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

function createOutgoingGroupedEdges(
  groups: GroupInfo[],
  edges: ServiceMapEdge[],
  groupedNodeIds: Set<string>
): ServiceMapEdge[] {
  const nodeToGroup = new Map<string, string>();
  const outgoingEdgeKeys = new Set<string>();
  const outgoingEdges: ServiceMapEdge[] = [];

  for (const group of groups) {
    for (const target of group.targets) {
      nodeToGroup.set(target, group.id);
    }
  }

  for (const edge of edges) {
    const groupId = nodeToGroup.get(edge.source);
    if (groupId && !groupedNodeIds.has(edge.target)) {
      const edgeKey = `${groupId}~>${edge.target}`;
      if (!outgoingEdgeKeys.has(edgeKey)) {
        outgoingEdgeKeys.add(edgeKey);
        outgoingEdges.push({
          id: edgeKey,
          source: groupId,
          target: edge.target,
          type: 'default' as const,
          style: DEFAULT_EDGE_STYLE,
          markerEnd: createEdgeMarker(),
          data: { isBidirectional: false },
        });
      }
    }
  }

  return outgoingEdges;
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

  const ungroupedNodes = nodes.filter((n) => !groupedNodeIds.has(n.id));
  const ungroupedEdges = edges.filter(
    (e) => !groupedEdgeIds.has(getEdgeId(e.source, e.target)) && !groupedNodeIds.has(e.source)
  );

  // Create grouped nodes and edges
  const groupedNodes = groups.map((g) => createGroupedNode(g, nodesById));
  const incomingGroupedEdges = groups.flatMap((g) => createIncomingGroupedEdges(g));
  const outgoingGroupedEdges = createOutgoingGroupedEdges(groups, edges, groupedNodeIds);

  return {
    nodes: [...ungroupedNodes, ...groupedNodes],
    edges: [...ungroupedEdges, ...incomingGroupedEdges, ...outgoingGroupedEdges],
    nodesCount: ungroupedNodes.length,
  };
}
