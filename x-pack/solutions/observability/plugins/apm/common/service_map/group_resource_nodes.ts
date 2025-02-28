/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { compact, groupBy } from 'lodash';
import { SPAN_TYPE, SPAN_SUBTYPE } from '../es_fields/apm';
import type {
  ConnectionEdge,
  ConnectionElement,
  ConnectionNode,
  GroupResourceNodesResponse,
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
  const groupedTargets = Array.from(edgesMap.values()).reduce(
    (acc, { data: { source, target } }) => {
      if (groupableNodeIds.has(target)) {
        const sources = acc.get(target) ?? [];
        sources.push(source);
        acc.set(target, sources);
      }

      return acc;
    },
    new Map<string, string[]>()
  );

  const adjacencyList = Array.from(groupedTargets.entries()).map(([target, sources]) => ({
    target,
    sources,
    groupId: `resourceGroup{${[...sources].sort().join(';')}}`,
  }));

  const grouped = groupBy(adjacencyList, 'groupId');
  return Object.entries(grouped)
    .map(([id, group]) => ({
      id,
      sources: group[0].sources,
      targets: group.map(({ target }) => target),
    }))
    .filter(({ targets }) => targets.length >= MINIMUM_GROUP_SIZE);
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

  groupedConnections.forEach(({ sources, targets }) => {
    targets.forEach((target) => {
      ungroupedNodes.delete(target);
      sources.forEach((source) => {
        ungroupedEdges.delete(getEdgeId({ source, target }));
      });
    });
  });

  return {
    ungroupedNodes: Array.from(ungroupedNodes.values()),
    ungroupedEdges: Array.from(ungroupedEdges.values()),
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
        groupedConnections: compact(
          targets.map((target) => {
            const targetElement = nodesMap.get(target);
            return targetElement
              ? { label: targetElement.data.label || targetElement.data.id, ...targetElement.data }
              : undefined;
          })
        ),
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
  const edgesMap = new Map(elements.filter(isEdge).map((edge) => [getEdgeId(edge.data), edge]));
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
    elements: [...ungroupedNodes, ...groupedNodes, ...ungroupedEdges, ...groupedEdges],
    nodesCount: ungroupedNodes.length,
  };
}
