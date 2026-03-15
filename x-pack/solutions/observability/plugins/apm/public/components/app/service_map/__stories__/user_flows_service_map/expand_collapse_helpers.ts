/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  DependencyNodeData,
  GroupedNodeData,
} from '../../../../../../common/service_map';
import { isGroupedNodeData } from '../../../../../../common/service_map';
import type { GroupedServiceNodeData } from './grouped_service_node';

const DEFAULT_EDGE_COLOR = '#c8c8c8';

function createDefaultEdgeStyle(color: string = DEFAULT_EDGE_COLOR) {
  return {
    type: 'default' as const,
    style: {
      stroke: color,
      strokeWidth: 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color,
    },
  };
}

/**
 * Given base nodes and edges, and a set of expanded group IDs, returns
 * nodes and edges with grouped nodes either shown as a single group (collapsed)
 * or exploded into individual dependency nodes (expanded).
 */
export function applyExpandedGroups(
  baseNodes: ServiceMapNode[],
  baseEdges: ServiceMapEdge[],
  expandedGroupIds: Set<string>
): { nodes: ServiceMapNode[]; edges: ServiceMapEdge[] } {
  const nodes: ServiceMapNode[] = [];
  const edges: ServiceMapEdge[] = [];
  const groupIdToConnectionIds = new Map<string, string[]>();

  for (const node of baseNodes) {
    if (isGroupedNodeData(node.data)) {
      const groupId = node.id;
      if (expandedGroupIds.has(groupId)) {
        const data = node.data as GroupedNodeData;
        for (const conn of data.groupedConnections) {
          const depData: DependencyNodeData = {
            id: conn.id,
            label: conn.label,
            isService: false,
            spanType: data.spanType,
            spanSubtype: data.spanSubtype,
          };
          nodes.push({
            id: conn.id,
            type: 'dependency',
            position: { x: 0, y: 0 },
            data: depData,
          });
          const list = groupIdToConnectionIds.get(groupId) ?? [];
          list.push(conn.id);
          groupIdToConnectionIds.set(groupId, list);
        }
      } else {
        nodes.push({ ...node });
      }
    } else {
      nodes.push({ ...node });
    }
  }

  for (const edge of baseEdges) {
    const targetGroupExpanded = groupIdToConnectionIds.has(edge.target);
    if (targetGroupExpanded) {
      const connectionIds = groupIdToConnectionIds.get(edge.target)!;
      for (const targetId of connectionIds) {
        edges.push({
          ...edge,
          id: `${edge.source}~${targetId}`,
          target: targetId,
          data: {
            ...edge.data,
            targetData: { id: targetId },
          },
          ...createDefaultEdgeStyle(),
        } as ServiceMapEdge);
      }
    } else if (!expandedGroupIds.has(edge.target)) {
      edges.push({ ...edge });
    }
  }

  return { nodes, edges };
}

/** Demo-only: a node that represents multiple services collapsed into one group */
export type GroupedServiceMapNode = Node<
  GroupedServiceNodeData & Record<string, unknown>,
  'groupedService'
>;

/** Demo-only: definition of a service group (used for collapse/expand) */
export interface ServiceGroupDefinition {
  id: string;
  label: string;
  serviceIds: string[];
}

/**
 * Given base nodes and edges, and service group definitions, returns nodes and edges
 * with service groups either shown as a single grouped-service node (collapsed) or
 * as individual service nodes (expanded). Only affects service nodes; dependency and
 * grouped-resource nodes are passed through.
 */
export function applyExpandedServiceGroups(
  baseNodes: ServiceMapNode[],
  baseEdges: ServiceMapEdge[],
  serviceGroups: ServiceGroupDefinition[],
  expandedGroupIds: Set<string>
): { nodes: Array<ServiceMapNode | GroupedServiceMapNode>; edges: ServiceMapEdge[] } {
  const serviceIdsInCollapsedGroups = new Set<string>();

  for (const group of serviceGroups) {
    if (!expandedGroupIds.has(group.id)) {
      for (const sid of group.serviceIds) {
        serviceIdsInCollapsedGroups.add(sid);
      }
    }
  }

  const nodes: Array<ServiceMapNode | GroupedServiceMapNode> = [];
  for (const node of baseNodes) {
    if (
      node.type === 'service' &&
      node.data?.id &&
      serviceIdsInCollapsedGroups.has(node.data.id as string)
    ) {
      continue;
    }
    nodes.push({ ...node });
  }

  for (const group of serviceGroups) {
    if (!expandedGroupIds.has(group.id)) {
      nodes.push({
        id: group.id,
        type: 'groupedService',
        position: { x: 0, y: 0 },
        data: {
          id: group.id,
          label: group.label,
          count: group.serviceIds.length,
        },
      });
    }
  }

  const serviceIdToGroupId = new Map<string, string>();
  for (const group of serviceGroups) {
    if (!expandedGroupIds.has(group.id)) {
      for (const sid of group.serviceIds) {
        serviceIdToGroupId.set(sid, group.id);
      }
    }
  }

  const seenEdges = new Set<string>();
  const edges: ServiceMapEdge[] = [];
  for (const edge of baseEdges) {
    let source = edge.source;
    let target = edge.target;
    if (serviceIdToGroupId.has(edge.source)) {
      source = serviceIdToGroupId.get(edge.source)!;
    }
    if (serviceIdToGroupId.has(edge.target)) {
      target = serviceIdToGroupId.get(edge.target)!;
    }
    if (source === target) {
      continue;
    }
    const key = `${source}~${target}`;
    if (seenEdges.has(key)) {
      continue;
    }
    seenEdges.add(key);
    edges.push({
      ...edge,
      id: key,
      source,
      target,
      ...createDefaultEdgeStyle(),
    } as ServiceMapEdge);
  }

  return { nodes, edges };
}
