/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { compact, groupBy } from 'lodash';
import { SPAN_TYPE, SPAN_SUBTYPE } from '../es_fields/apm';
import type { ConnectionEdge, ConnectionElement, ConnectionNode } from './types';
import { isSpanGroupingSupported } from './utils';

const MINIMUM_GROUP_SIZE = 4;

type GroupedConnection = ConnectionNode | ConnectionEdge;

export interface GroupedNode {
  data: {
    id: string;
    'span.type': string;
    label: string;
    groupedConnections: GroupedConnection[];
  };
}

export interface GroupedEdge {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

export interface GroupResourceNodesResponse {
  elements: Array<GroupedNode | GroupedEdge | ConnectionElement>;
  nodesCount: number;
}

const isEdge = (el: ConnectionElement) => Boolean(el.data.source && el.data.target);
const isNode = (el: ConnectionElement) => !isEdge(el);
const isElligibleGroupNode = (el: ConnectionElement) => {
  if (isNode(el) && SPAN_TYPE in el.data) {
    return isSpanGroupingSupported(el.data[SPAN_TYPE], el.data[SPAN_SUBTYPE]);
  }
  return false;
};

export function groupResourceNodes(responseData: {
  elements: ConnectionElement[];
}): GroupResourceNodesResponse {
  const nodesMap = new Map(
    responseData.elements.filter(isNode).map((node) => [node.data.id, node])
  );
  const edgesMap = new Map(
    responseData.elements
      .filter(isEdge)
      .map((edge) => [`${edge.data.source}|${edge.data.target}`, edge])
  );

  // create adjacency list by targets
  const groupNodeCandidates = responseData.elements
    .filter(isElligibleGroupNode)
    .map(({ data: { id } }) => id);

  const adjacencyListByTargetMap = Array.from(edgesMap.values()).reduce(
    (acc, { data: { source, target } }) => {
      if (groupNodeCandidates.includes(target)) {
        const sources = acc.get(target) ?? [];
        sources.push(source);
        acc.set(target, sources);
      }

      return acc;
    },
    new Map<string, string[]>()
  );

  const adjacencyListByTarget = Array.from(adjacencyListByTargetMap.entries()).map(
    ([target, sources]) => ({
      target,
      sources,
      groupId: `resourceGroup{${sources.sort().join(';')}}`,
    })
  );

  // group by members
  const nodeGroupsById = groupBy(adjacencyListByTarget, 'groupId');
  const nodeGroups = Object.keys(nodeGroupsById)
    .map((id) => ({
      id,
      sources: nodeGroupsById[id][0].sources,
      targets: nodeGroupsById[id].map(({ target }) => target),
    }))
    .filter(({ targets }) => targets.length > MINIMUM_GROUP_SIZE - 1);

  const ungroupedEdges = new Map(edgesMap);
  const ungroupedNodes = new Map(nodesMap);

  nodeGroups.forEach(({ sources, targets }) => {
    targets.forEach((target) => {
      // removes grouped nodes from original node set:
      ungroupedNodes.delete(target);
      sources.forEach((source) => {
        ungroupedEdges.delete(`${source}|${target}`);
      });
    });
  });

  // add in a composite node for each new group
  const groupedNodes = nodeGroups.map(
    ({ id, targets }): GroupedNode => ({
      data: {
        id,
        [SPAN_TYPE]: 'external',
        label: i18n.translate('xpack.apm.serviceMap.resourceCountLabel', {
          defaultMessage: '{count} resources',
          values: { count: targets.length },
        }),
        groupedConnections: compact(
          targets.map((targetId) => {
            const targetElement = nodesMap.get(targetId);
            if (!targetElement) {
              return undefined;
            }
            const { data } = targetElement;
            return { label: data.label || data.id, ...data };
          })
        ),
      },
    })
  );

  // add new edges from source to new groups
  const groupedEdges: GroupedEdge[] = nodeGroups.flatMap(({ id, sources }) =>
    sources.map((source) => ({
      data: {
        id: `${source}~>${id}`,
        source,
        target: id,
      },
    }))
  );

  return {
    elements: [
      ...Array.from(ungroupedNodes.values()),
      ...groupedNodes,
      ...Array.from(ungroupedEdges.values()),
      ...groupedEdges,
    ],
    nodesCount: ungroupedNodes.size,
  };
}
