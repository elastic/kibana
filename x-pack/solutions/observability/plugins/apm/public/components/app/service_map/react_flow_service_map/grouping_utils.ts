/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from '@xyflow/react';
import type { ServiceMapNodeData } from './service_node';
import type { ServiceGroup } from './use_expand_collapse';
import type { SavedServiceGroup } from '../../../../../common/service_groups';

// Cache for parsed kuery results to avoid re-parsing the same kuery multiple times
const kueryParseCache = new Map<string, { serviceNames: string[]; wildcardPatterns: string[] }>();

/**
 * Parses a service group kuery to extract service names and wildcard patterns.
 * Results are cached to avoid re-parsing the same kuery.
 */
function parseKuery(kuery: string): { serviceNames: string[]; wildcardPatterns: string[] } {
  // Check cache first
  const cached = kueryParseCache.get(kuery);
  if (cached) {
    return cached;
  }

  const serviceNames: string[] = [];
  const wildcardPatterns: string[] = [];

  // Pattern 1: service.name: "value" or service.name: 'value'
  const quotedPattern = /service\.name\s*:\s*["']([^"']+)["']/gi;
  let match;
  while ((match = quotedPattern.exec(kuery)) !== null) {
    serviceNames.push(match[1].toLowerCase());
  }

  // Pattern 2: service.name: value (without quotes, word characters and hyphens)
  const unquotedPattern = /service\.name\s*:\s*([a-zA-Z0-9_-]+)(?:\s|$|OR|AND|\))/gi;
  while ((match = unquotedPattern.exec(kuery)) !== null) {
    const value = match[1].toLowerCase();
    if (!serviceNames.includes(value)) {
      serviceNames.push(value);
    }
  }

  // Pattern 3: service.name: (value1 OR value2)
  const groupPattern = /service\.name\s*:\s*\(([^)]+)\)/gi;
  while ((match = groupPattern.exec(kuery)) !== null) {
    const group = match[1];
    const values = group.split(/\s+OR\s+/i);
    for (const value of values) {
      const trimmed = value
        .trim()
        .replace(/^["']|["']$/g, '')
        .toLowerCase();
      if (trimmed && !serviceNames.includes(trimmed)) {
        serviceNames.push(trimmed);
      }
    }
  }

  // Extract wildcard patterns
  if (serviceNames.length === 0) {
    const wildcardMatcher = /service\.name\s*:\s*\*?([^*\s]+)\*?/gi;
    while ((match = wildcardMatcher.exec(kuery)) !== null) {
      wildcardPatterns.push(match[1].toLowerCase());
    }
  }

  const result = { serviceNames, wildcardPatterns };
  kueryParseCache.set(kuery, result);
  return result;
}

/**
 * Creates a matcher function for a kuery. The matcher is pre-parsed for efficiency.
 */
function createKueryMatcher(kuery: string): (serviceName: string) => boolean {
  const { serviceNames, wildcardPatterns } = parseKuery(kuery);

  // Create a Set for O(1) lookups
  const serviceNameSet = new Set(serviceNames);

  return (serviceName: string): boolean => {
    const lowerName = serviceName.toLowerCase();

    // Check exact matches first (O(1))
    if (serviceNameSet.has(lowerName)) {
      return true;
    }

    // Check if any service name is contained in the name
    for (const name of serviceNames) {
      if (lowerName.includes(name)) {
        return true;
      }
    }

    // Check wildcard patterns
    for (const pattern of wildcardPatterns) {
      if (lowerName.includes(pattern)) {
        return true;
      }
    }

    return false;
  };
}

/**
 * Creates ServiceGroup objects from selected SavedServiceGroups by matching
 * service nodes against each group's kuery.
 * Optimized to pre-parse kueries and filter service nodes once.
 */
export function createGroupsFromServiceGroups(
  nodes: Node<ServiceMapNodeData>[],
  savedServiceGroups: SavedServiceGroup[],
  selectedGroupIds: string[]
): ServiceGroup[] {
  // Early exit if no selections
  if (selectedGroupIds.length === 0) {
    return [];
  }

  // Create a Set for O(1) lookup of selected group IDs
  const selectedGroupIdSet = new Set(selectedGroupIds);

  // Filter to only selected groups
  const selectedGroups = savedServiceGroups.filter((g) => selectedGroupIdSet.has(g.id));

  if (selectedGroups.length === 0) {
    return [];
  }

  // Pre-filter to only service nodes (avoid checking isService for each group)
  const serviceNodes = nodes.filter((n) => n.data.isService);

  // Create matchers for all selected groups upfront (avoids re-parsing kuery for each node)
  const groupMatchers = selectedGroups.map((group) => ({
    group,
    matcher: createKueryMatcher(group.kuery),
  }));

  const groups: ServiceGroup[] = [];

  for (const { group, matcher } of groupMatchers) {
    const matchingNodeIds: string[] = [];

    for (const node of serviceNodes) {
      const serviceName = node.data.label || node.id;
      if (matcher(serviceName)) {
        matchingNodeIds.push(node.id);
      }
    }

    if (matchingNodeIds.length > 0) {
      groups.push({
        id: group.id,
        name: group.groupName,
        nodeIds: matchingNodeIds,
        color: group.color,
      });
    }
  }

  return groups;
}
