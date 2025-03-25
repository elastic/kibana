/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SPAN_TYPE, SPAN_SUBTYPE } from '../es_fields/apm';
import type {
  ConnectionEdge,
  ConnectionElement,
  ConnectionNode,
  GroupResourceNodesResponse,
  GroupedConnection,
  GroupedEdge,
  GroupedNode,
} from './types';
import { getEdgeId, isSpanGroupingSupported } from './utils';

const MINIMUM_GROUP_SIZE = 4;

const isEdge = (el: ConnectionElement): el is { data: ConnectionEdge } =>
  Boolean(el.data.source && el.data.target);
const isNode = (el: ConnectionElement): el is { data: ConnectionNode } => !isEdge(el);
const isElligibleGroupNode = (el: ConnectionElement): el is { data: ConnectionNode } => {
  if (isNode(el) && SPAN_TYPE in el.data) {
    return isSpanGroupingSupported(el.data[SPAN_TYPE], el.data[SPAN_SUBTYPE]);
  }
  return false;
};

function groupConnections({
  edgesMap,
  groupableNodeIds,
}: {
  edgesMap: Map<string, ConnectionElement>;
  groupableNodeIds: Set<string>;
}) {
  const sourcesByTarget = new Map<string, string[]>();
  for (const { data } of edgesMap.values()) {
    const { source, target } = data;
    if (groupableNodeIds.has(target)) {
      const sources = sourcesByTarget.get(target) ?? [];
      sources.push(source);
      sourcesByTarget.set(target, sources);
    }
  }

  const groups = new Map<string, { id: string; sources: string[]; targets: string[] }>();
  for (const [target, sources] of sourcesByTarget) {
    const groupId = `resourceGroup{${[...sources].sort().join(';')}}`;
    const group = groups.get(groupId) ?? { id: groupId, sources, targets: [] };
    group.targets.push(target);
    groups.set(groupId, group);
  }

  return Array.from(groups.values()).filter(({ targets }) => targets.length >= MINIMUM_GROUP_SIZE);
}

function getUngroupedNodesAndEdges({
  nodesMap,
  edgesMap,
  groupedConnections,
}: {
  nodesMap: Map<string, { data: ConnectionNode }>;
  edgesMap: Map<string, { data: ConnectionEdge }>;
  groupedConnections: ReturnType<typeof groupConnections>;
}) {
  const ungroupedEdges = new Map(edgesMap);
  const ungroupedNodes = new Map(nodesMap);

  for (const { sources, targets } of groupedConnections) {
    targets.forEach((target) => {
      ungroupedNodes.delete(target);
      sources.forEach((source) => {
        ungroupedEdges.delete(getEdgeId(source, target));
      });
    });
  }

  return {
    ungroupedNodes,
    ungroupedEdges,
  };
}

function groupNodes({
  nodesMap,
  groupedConnections,
}: {
  nodesMap: Map<string, ConnectionElement>;
  groupedConnections: ReturnType<typeof groupConnections>;
}) {
  return groupedConnections.map(
    ({ id, targets }): GroupedNode => ({
      data: {
        id,
        [SPAN_TYPE]: 'external',
        label: i18n.translate('xpack.apm.serviceMap.resourceCountLabel', {
          defaultMessage: '{count} resources',
          values: { count: targets.length },
        }),
        groupedConnections: targets
          .map((target) => {
            const targetElement = nodesMap.get(target);
            return targetElement
              ? {
                  ...targetElement.data,
                  label: targetElement.data.label || targetElement.data.id,
                }
              : undefined;
          })
          .filter((target): target is GroupedConnection => !!target),
      },
    })
  );
}

function groupEdges({
  groupedConnections,
}: {
  groupedConnections: ReturnType<typeof groupConnections>;
}) {
  return groupedConnections.flatMap(({ id, sources }) =>
    sources.map(
      (source): GroupedEdge => ({
        data: {
          id: `${source}~>${id}`,
          source,
          target: id,
        },
      })
    )
  );
}

export function groupResourceNodes({
  elements,
}: {
  elements: ConnectionElement[];
}): GroupResourceNodesResponse {
  const nodesMap = new Map(elements.filter(isNode).map((node) => [node.data.id, node]));
  const edgesMap = new Map(
    elements.filter(isEdge).map((edge) => [getEdgeId(edge.data.source, edge.data.target), edge])
  );
  const groupableNodeIds = new Set(
    elements.filter(isElligibleGroupNode).map(({ data: { id } }) => id)
  );

  const groupedConnections = groupConnections({ edgesMap, groupableNodeIds });
  const { ungroupedEdges, ungroupedNodes } = getUngroupedNodesAndEdges({
    nodesMap,
    edgesMap,
    groupedConnections,
  });

  const groupedNodes = groupNodes({ nodesMap, groupedConnections });
  const groupedEdges = groupEdges({ groupedConnections });

  return {
    elements: [
      ...ungroupedNodes.values(),
      ...groupedNodes,
      ...ungroupedEdges.values(),
      ...groupedEdges,
    ],
    nodesCount: ungroupedNodes.size,
  };
}
