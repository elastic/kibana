/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge } from '@xyflow/react';
import type { ServiceMapNodeData } from './service_node';
import type { ServiceMapEdgeData } from './transform_data';
import type { ServiceGroup } from './use_expand_collapse';

export interface GroupingOptions {
  /**
   * Minimum number of nodes required to form a group.
   * Groups with fewer nodes than this will not be created.
   * Default: 2
   */
  minGroupSize?: number;
}

const DEFAULT_OPTIONS: Required<GroupingOptions> = {
  minGroupSize: 2,
};

/**
 * Identifies clusters of tightly connected services that could be grouped together.
 * Uses a simple heuristic: services that share many direct connections
 * (both as source and target) are likely related and can be grouped.
 */
export function identifyServiceClusters(
  nodes: Node<ServiceMapNodeData>[],
  edges: Edge<ServiceMapEdgeData>[],
  options: GroupingOptions = {}
): ServiceGroup[] {
  const { minGroupSize } = { ...DEFAULT_OPTIONS, ...options };

  // Build adjacency list for service nodes only
  const serviceNodes = nodes.filter((n) => n.data.isService);
  const adjacency = new Map<string, Set<string>>();

  for (const node of serviceNodes) {
    adjacency.set(node.id, new Set());
  }

  // Add connections (bidirectional for clustering purposes)
  for (const edge of edges) {
    if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }
  }

  // Find connected components using DFS
  const visited = new Set<string>();
  const groups: ServiceGroup[] = [];
  let groupIndex = 0;

  function dfs(nodeId: string, cluster: string[]): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    cluster.push(nodeId);

    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor, cluster);
      }
    }
  }

  // Find connected components
  for (const node of serviceNodes) {
    if (!visited.has(node.id)) {
      const cluster: string[] = [];
      dfs(node.id, cluster);

      if (cluster.length >= minGroupSize) {
        // Create a group name based on common patterns in service names
        const groupName = generateGroupName(
          cluster.map((id) => serviceNodes.find((n) => n.id === id)?.data.label || id)
        );

        groups.push({
          id: `cluster-${groupIndex++}`,
          name: groupName,
          nodeIds: cluster,
        });
      }
    }
  }

  return groups;
}

/**
 * Creates groups based on a prefix pattern in service names.
 * For example, services like "user-service", "user-api", "user-worker"
 * would be grouped together as "user-*" group.
 */
export function groupByNamePrefix(
  nodes: Node<ServiceMapNodeData>[],
  options: GroupingOptions = {}
): ServiceGroup[] {
  const { minGroupSize } = { ...DEFAULT_OPTIONS, ...options };

  const serviceNodes = nodes.filter((n) => n.data.isService);
  const prefixGroups = new Map<string, string[]>();

  for (const node of serviceNodes) {
    const label = node.data.label;

    // Try to extract a prefix (before first hyphen, underscore, or camelCase boundary)
    const prefix = extractPrefix(label);

    if (prefix && prefix.length >= 2) {
      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, []);
      }
      prefixGroups.get(prefix)!.push(node.id);
    }
  }

  // Convert to ServiceGroup array, filtering by minimum size
  const groups: ServiceGroup[] = [];

  for (const [prefix, nodeIds] of prefixGroups) {
    if (nodeIds.length >= minGroupSize) {
      groups.push({
        id: `prefix-${prefix}`,
        name: `${prefix} services`,
        nodeIds,
      });
    }
  }

  return groups;
}

/**
 * Creates a manual group from a list of service IDs.
 * Use this when you want explicit control over grouping.
 */
export function createManualGroup(id: string, name: string, nodeIds: string[]): ServiceGroup {
  return { id, name, nodeIds };
}

/**
 * Extracts a common prefix from a service name.
 * Handles hyphen-case, underscore_case, and camelCase.
 */
function extractPrefix(name: string): string | null {
  // Try hyphen-case first (most common in microservices)
  const hyphenMatch = name.match(/^([a-zA-Z0-9]+)-/);
  if (hyphenMatch) {
    return hyphenMatch[1].toLowerCase();
  }

  // Try underscore_case
  const underscoreMatch = name.match(/^([a-zA-Z0-9]+)_/);
  if (underscoreMatch) {
    return underscoreMatch[1].toLowerCase();
  }

  // Try camelCase (split on uppercase)
  const camelMatch = name.match(/^([a-z]+)[A-Z]/);
  if (camelMatch) {
    return camelMatch[1].toLowerCase();
  }

  return null;
}

/**
 * Generates a meaningful group name from a list of service labels.
 * Tries to find a common prefix or pattern.
 */
function generateGroupName(labels: string[]): string {
  if (labels.length === 0) return 'Services';
  if (labels.length === 1) return labels[0];

  // Try to find common prefix
  const prefixes = labels.map((l) => extractPrefix(l)).filter(Boolean) as string[];

  if (prefixes.length > 0) {
    // Find the most common prefix
    const prefixCounts = new Map<string, number>();
    for (const prefix of prefixes) {
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }

    let mostCommon = '';
    let maxCount = 0;
    for (const [prefix, count] of prefixCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = prefix;
      }
    }

    if (mostCommon && maxCount >= labels.length / 2) {
      return `${mostCommon} services`;
    }
  }

  // Fall back to "N connected services"
  return `${labels.length} connected services`;
}
