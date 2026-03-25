/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceMapEdge, ServiceNodeData, SubflowGroupNodeData } from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import { NODE_WIDTH, NODE_HEIGHT } from './constants';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
} from '../../../../common/es_fields/apm';

const GROUP_PADDING = 40;
/** Minimum gap between group bounding boxes so groups do not overlap. */
const GROUP_GAP = 24;

/** Colors for subflow groups (distinct per group). */
const SUBFLOW_GROUP_COLORS = [
  '#0077CC', // eui primary
  '#00BFB3', // eui success
  '#BD271E', // eui danger
  '#FEC514', // eui warning
  '#6DCCB1',
  '#F5A700',
  '#DD0A73',
  '#3185FC',
  '#37A2ED',
  '#F98510',
];

export function getGroupKey(
  node: ServiceMapNode,
  groupByField: string,
  serviceGroupByValues?: Record<string, string>
): string {
  if (node.type !== 'service' || !isServiceNodeData(node.data)) return '';
  const data = node.data as ServiceNodeData;

  // Use API-fetched value when grouping by a field not present on the map response
  if (serviceGroupByValues != null && node.id in serviceGroupByValues) {
    const value = serviceGroupByValues[node.id];
    return value !== '' ? value : 'unknown';
  }

  // Fields already available on the transformed service map node
  switch (groupByField) {
    case SERVICE_NAME:
      return node.id || data.label || '';
    case SERVICE_ENVIRONMENT:
      return data.serviceEnvironment ?? 'unknown';
    case AGENT_NAME:
      return data.agentName ?? 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * Returns distinct group values for a field across the given service nodes.
 * Used to filter group-by options to only fields with meaningful variety (e.g. not only "unknown").
 */
export function getDistinctGroupValues(
  nodes: ServiceMapNode[],
  groupByField: string,
  serviceGroupByValues?: Record<string, string>
): Set<string> {
  const serviceNodes = nodes.filter(
    (n): n is ServiceMapNode => n.type === 'service' && isServiceNodeData(n.data)
  );
  const values = new Set<string>();
  for (const node of serviceNodes) {
    const key = getGroupKey(node, groupByField, serviceGroupByValues);
    if (key !== '') values.add(key);
  }
  return values;
}

/**
 * Applies group-by: creates subflow group nodes and assigns service nodes to them via parentId.
 * Runs after layout: takes layouted nodes, partitions service nodes by group key, creates one
 * parent node per group with a bounding box, and sets children's positions relative to the group.
 * When grouping by a field not on the map response (e.g. transaction.type), pass serviceGroupByValues
 * from the group-by-values API so each service gets the correct group key.
 */
export function applyGroupBy(
  nodes: ServiceMapNode[],
  edges: ServiceMapEdge[],
  groupByField: string,
  serviceGroupByValues?: Record<string, string>
): ServiceMapNode[] {
  const serviceNodes = nodes.filter(
    (n): n is ServiceMapNode => n.type === 'service' && isServiceNodeData(n.data)
  );
  if (serviceNodes.length === 0) return nodes;

  const groupKeyToNodeIds = new Map<string, string[]>();
  for (const node of serviceNodes) {
    const key = getGroupKey(node, groupByField, serviceGroupByValues);
    const list = groupKeyToNodeIds.get(key) ?? [];
    list.push(node.id);
    groupKeyToNodeIds.set(key, list);
  }

  const groupNodes: ServiceMapNode[] = [];
  const nodesById = new Map<string, ServiceMapNode>(nodes.map((n) => [n.id, n]));
  let colorIndex = 0;

  for (const [groupKey, childIds] of groupKeyToNodeIds) {
    const childNodes = childIds
      .map((id) => nodesById.get(id))
      .filter((n): n is ServiceMapNode => n != null);
    if (childNodes.length === 0) continue;

    const minX = Math.min(...childNodes.map((n) => n.position.x));
    const minY = Math.min(...childNodes.map((n) => n.position.y));
    const maxX = Math.max(...childNodes.map((n) => n.position.x + NODE_WIDTH));
    const maxY = Math.max(...childNodes.map((n) => n.position.y + NODE_HEIGHT));

    const groupWidth = maxX - minX + 2 * GROUP_PADDING;
    const groupHeight = maxY - minY + 2 * GROUP_PADDING;
    const groupId = `subflow-group:${groupByField}:${groupKey}`;
    const color = SUBFLOW_GROUP_COLORS[colorIndex % SUBFLOW_GROUP_COLORS.length];
    colorIndex += 1;

    const groupData: SubflowGroupNodeData = {
      id: groupId,
      label: groupKey,
      groupKey,
      color,
      width: groupWidth,
      height: groupHeight,
      isSubflowGroup: true,
    };

    groupNodes.push({
      id: groupId,
      type: 'subflowGroup',
      position: { x: minX - GROUP_PADDING, y: minY - GROUP_PADDING },
      data: groupData,
      style: { width: groupWidth, height: groupHeight },
    });

    for (const node of childNodes) {
      const relX = node.position.x - minX;
      const relY = node.position.y - minY;
      const updated = {
        ...node,
        parentId: groupId,
        position: { x: relX, y: relY },
        extent: 'parent' as const,
      };
      nodesById.set(node.id, updated);
    }
  }

  // Reposition groups so their bounding boxes do not overlap (sort by position, then shift)
  const groupsWithBounds = groupNodes.map((g) => ({
    node: g,
    x: g.position.x,
    y: g.position.y,
    w: (g.style?.width as number) ?? g.data.width,
    h: (g.style?.height as number) ?? g.data.height,
  }));
  groupsWithBounds.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 1; i < groupsWithBounds.length; i++) {
    const curr = groupsWithBounds[i];
    for (let j = 0; j < i; j++) {
      const prev = groupsWithBounds[j];
      const prevRight = prev.x + prev.w + GROUP_GAP;
      const prevBottom = prev.y + prev.h + GROUP_GAP;
      const overlapsX = curr.x < prevRight && curr.x + curr.w > prev.x;
      const overlapsY = curr.y < prevBottom && curr.y + curr.h > prev.y;
      if (overlapsX && overlapsY) {
        const shiftRight = prevRight - curr.x;
        const shiftDown = prevBottom - curr.y;
        if (shiftRight > 0) curr.x += shiftRight;
        if (shiftDown > 0) curr.y += shiftDown;
      }
    }
    curr.node.position = { x: curr.x, y: curr.y };
  }

  const dependencyAndGroupedResourceNodes = nodes.filter(
    (n) => n.type !== 'service' || !isServiceNodeData(n.data)
  );
  const updatedServiceNodes = Array.from(nodesById.values()).filter(
    (n) => n.type === 'service' && isServiceNodeData(n.data)
  );

  return [...groupNodes, ...updatedServiceNodes, ...dependencyAndGroupedResourceNodes];
}
