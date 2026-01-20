/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { ServiceMapNodeData } from './service_node';
import type { ServiceMapEdgeData } from './transform_data';

export interface ServiceGroup {
  id: string;
  name: string;
  /** IDs of nodes that belong to this group */
  nodeIds: string[];
  /** Optional color for the group */
  color?: string;
}

export interface GroupNodeData extends ServiceMapNodeData {
  isGroup: true;
  childNodeIds: string[];
  childCount: number;
  isExpanded: boolean;
  /** Optional color for the group node */
  groupColor?: string;
}

/** Extended node data for nodes that belong to a group */
export interface GroupMemberNodeData extends ServiceMapNodeData {
  /** The group this node belongs to */
  groupId?: string;
  /** The name of the group this node belongs to */
  groupName?: string;
}

export interface UseExpandCollapseOptions {
  /** All nodes (including those that may be hidden when collapsed) */
  allNodes: Node<ServiceMapNodeData>[];
  /** All edges */
  allEdges: Edge<ServiceMapEdgeData>[];
  /** Groups to manage */
  groups: ServiceGroup[];
}

export interface UseExpandCollapseResult {
  /** Visible nodes (filtered based on expanded state) */
  visibleNodes: Node<ServiceMapNodeData | GroupNodeData | GroupMemberNodeData>[];
  /** Visible edges (filtered to only include edges between visible nodes) */
  visibleEdges: Edge<ServiceMapEdgeData>[];
  /** Set of expanded group IDs */
  expandedGroups: Set<string>;
  /** Toggle a group's expanded state */
  toggleGroup: (groupId: string) => void;
  /** Expand a specific group */
  expandGroup: (groupId: string) => void;
  /** Collapse a specific group */
  collapseGroup: (groupId: string) => void;
  /** Expand all groups */
  expandAll: () => void;
  /** Collapse all groups */
  collapseAll: () => void;
  /** Check if a group is expanded */
  isExpanded: (groupId: string) => boolean;
  /** Map of node ID to group info for quick lookups */
  nodeGroupInfo: Map<string, { groupId: string; groupName: string }>;
}

/**
 * Custom hook for managing expand/collapse state of node groups in React Flow.
 * This provides the same functionality as the React Flow Pro example, but implemented
 * using only free open-source React Flow features.
 *
 * Usage:
 * 1. Define groups of nodes that can be collapsed together
 * 2. Pass all nodes, edges, and group definitions to this hook
 * 3. Use the returned visibleNodes and visibleEdges in your React Flow component
 * 4. Call toggleGroup when a group node is clicked
 */
export function useExpandCollapse({
  allNodes,
  allEdges,
  groups,
}: UseExpandCollapseOptions): UseExpandCollapseResult {
  // Track which groups are expanded (all start collapsed by default to show grouping)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  // Create maps for quick lookups - combined into a single useMemo to avoid double iteration
  const { nodeGroupInfo, nodeToGroupMap, groupNodeIdSets } = useMemo(() => {
    const infoMap = new Map<string, { groupId: string; groupName: string }>();
    const groupMap = new Map<string, string>();
    const nodeSets = new Map<string, Set<string>>();

    for (const group of groups) {
      // Create a Set of node IDs for this group for O(1) lookups
      nodeSets.set(group.id, new Set(group.nodeIds));

      for (const nodeId of group.nodeIds) {
        infoMap.set(nodeId, { groupId: group.id, groupName: group.name });
        groupMap.set(nodeId, group.id);
      }
    }

    return { nodeGroupInfo: infoMap, nodeToGroupMap: groupMap, groupNodeIdSets: nodeSets };
  }, [groups]);

  // Calculate visible nodes based on expanded state
  const visibleNodes = useMemo(() => {
    // Early exit if no groups
    if (groups.length === 0) {
      return allNodes;
    }

    const result: Node<ServiceMapNodeData | GroupNodeData | GroupMemberNodeData>[] = [];

    // Build set of hidden node IDs from collapsed groups (O(n) where n = nodes in collapsed groups)
    const hiddenNodeIds = new Set<string>();
    const collapsedGroups: typeof groups = [];

    for (const group of groups) {
      if (!expandedGroups.has(group.id)) {
        collapsedGroups.push(group);
        // Use the pre-computed Set for this group
        const nodeIdSet = groupNodeIdSets.get(group.id);
        if (nodeIdSet) {
          for (const nodeId of nodeIdSet) {
            hiddenNodeIds.add(nodeId);
          }
        }
      }
    }

    // Add non-hidden nodes (single pass through allNodes)
    for (const node of allNodes) {
      if (hiddenNodeIds.has(node.id)) {
        continue;
      }

      const groupInfo = nodeGroupInfo.get(node.id);
      if (groupInfo && expandedGroups.has(groupInfo.groupId)) {
        // Node is part of an expanded group - add group membership info
        result.push({
          ...node,
          data: {
            ...node.data,
            groupId: groupInfo.groupId,
            groupName: groupInfo.groupName,
          },
        } as Node<GroupMemberNodeData>);
      } else {
        result.push(node);
      }
    }

    // Add group nodes for collapsed groups
    // Use nodeToGroupMap for O(1) lookup to find first child
    for (const group of collapsedGroups) {
      // Find first matching node efficiently using the Set
      const nodeIdSet = groupNodeIdSets.get(group.id);
      let firstChild: Node<ServiceMapNodeData> | undefined;

      if (nodeIdSet && nodeIdSet.size > 0) {
        // Get first node ID from the set
        const firstNodeId = nodeIdSet.values().next().value;
        firstChild = allNodes.find((n) => n.id === firstNodeId);
      }

      const groupNode: Node<GroupNodeData> = {
        id: `group-${group.id}`,
        type: 'group',
        position: firstChild?.position ?? { x: 0, y: 0 },
        data: {
          id: `group-${group.id}`,
          label: group.name,
          isService: true,
          isGroup: true,
          childNodeIds: group.nodeIds,
          childCount: group.nodeIds.length,
          isExpanded: false,
          groupColor: group.color,
        },
      };

      result.push(groupNode);
    }

    return result;
  }, [allNodes, groups, expandedGroups, nodeGroupInfo, groupNodeIdSets]);

  // Calculate visible edges based on visible nodes
  const visibleEdges = useMemo(() => {
    // Early exit if no edges
    if (allEdges.length === 0) {
      return [];
    }

    // Build visible node ID set once
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const result: Edge<ServiceMapEdgeData>[] = [];
    const addedEdges = new Set<string>();

    for (const edge of allEdges) {
      // Check if source/target are in collapsed groups (O(1) lookups)
      const sourceGroupId = nodeToGroupMap.get(edge.source);
      const targetGroupId = nodeToGroupMap.get(edge.target);

      const sourceId =
        sourceGroupId && !expandedGroups.has(sourceGroupId)
          ? `group-${sourceGroupId}`
          : edge.source;

      const targetId =
        targetGroupId && !expandedGroups.has(targetGroupId)
          ? `group-${targetGroupId}`
          : edge.target;

      // Skip self-loops (edges within the same collapsed group)
      if (sourceId === targetId) {
        continue;
      }

      // Only include edge if both ends are visible
      if (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId)) {
        continue;
      }

      const edgeKey = `${sourceId}-${targetId}`;

      // Avoid duplicate edges
      if (addedEdges.has(edgeKey)) {
        continue;
      }

      addedEdges.add(edgeKey);

      // Only create new object if source/target changed
      if (sourceId === edge.source && targetId === edge.target) {
        result.push(edge);
      } else {
        result.push({
          ...edge,
          id: edgeKey,
          source: sourceId,
          target: targetId,
        });
      }
    }

    return result;
  }, [allEdges, visibleNodes, nodeToGroupMap, expandedGroups]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const expandGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
  }, []);

  const collapseGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(groups.map((g) => g.id)));
  }, [groups]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const isExpanded = useCallback(
    (groupId: string) => expandedGroups.has(groupId),
    [expandedGroups]
  );

  return {
    visibleNodes,
    visibleEdges,
    expandedGroups,
    toggleGroup,
    expandGroup,
    collapseGroup,
    expandAll,
    collapseAll,
    isExpanded,
    nodeGroupInfo,
  };
}
