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
}

export interface GroupNodeData extends ServiceMapNodeData {
  isGroup: true;
  childNodeIds: string[];
  childCount: number;
  isExpanded: boolean;
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

  // Create a map of nodeId -> group info for quick lookups
  const nodeGroupInfo = useMemo(() => {
    const map = new Map<string, { groupId: string; groupName: string }>();
    for (const group of groups) {
      for (const nodeId of group.nodeIds) {
        map.set(nodeId, { groupId: group.id, groupName: group.name });
      }
    }
    return map;
  }, [groups]);

  // Simple map for backward compatibility
  const nodeToGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [nodeId, info] of nodeGroupInfo) {
      map.set(nodeId, info.groupId);
    }
    return map;
  }, [nodeGroupInfo]);

  // Calculate visible nodes based on expanded state
  const visibleNodes = useMemo(() => {
    const result: Node<ServiceMapNodeData | GroupNodeData | GroupMemberNodeData>[] = [];
    const hiddenNodeIds = new Set<string>();

    // First, identify nodes that should be hidden (in collapsed groups)
    for (const group of groups) {
      if (!expandedGroups.has(group.id)) {
        // Group is collapsed - hide all child nodes
        for (const nodeId of group.nodeIds) {
          hiddenNodeIds.add(nodeId);
        }
      }
    }

    // Add non-hidden nodes (with group membership info if applicable)
    for (const node of allNodes) {
      if (!hiddenNodeIds.has(node.id)) {
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
    }

    // Add group nodes for collapsed groups
    for (const group of groups) {
      if (!expandedGroups.has(group.id)) {
        // Find a representative node to get position hints
        const childNodes = allNodes.filter((n) => group.nodeIds.includes(n.id));
        const firstChild = childNodes[0];

        // Create a group node that represents the collapsed group
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
          },
        };

        result.push(groupNode);
      }
    }

    return result;
  }, [allNodes, groups, expandedGroups, nodeGroupInfo]);

  // Calculate visible edges based on visible nodes
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const result: Edge<ServiceMapEdgeData>[] = [];
    const addedEdges = new Set<string>();

    for (const edge of allEdges) {
      let sourceId = edge.source;
      let targetId = edge.target;

      // Check if source node is hidden (in a collapsed group)
      const sourceGroupId = nodeToGroupMap.get(sourceId);
      if (sourceGroupId && !expandedGroups.has(sourceGroupId)) {
        sourceId = `group-${sourceGroupId}`;
      }

      // Check if target node is hidden (in a collapsed group)
      const targetGroupId = nodeToGroupMap.get(targetId);
      if (targetGroupId && !expandedGroups.has(targetGroupId)) {
        targetId = `group-${targetGroupId}`;
      }

      // Skip self-loops (edges within the same collapsed group)
      if (sourceId === targetId) {
        continue;
      }

      // Only include edge if both ends are visible
      if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
        const edgeKey = `${sourceId}-${targetId}`;

        // Avoid duplicate edges (multiple original edges might map to the same group edge)
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);
          result.push({
            ...edge,
            id: sourceId === edge.source && targetId === edge.target ? edge.id : edgeKey,
            source: sourceId,
            target: targetId,
          });
        }
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
