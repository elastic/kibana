/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import { ValuesType } from 'utility-types';
import {
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  ConnectionElement,
  isSpanGroupingSupported,
} from '../../../common/service_map';

const MINIMUM_GROUP_SIZE = 4;

export function groupResourceNodes(responseData: {
  elements: ConnectionElement[];
}) {
  type ElementDefinition = ValuesType<typeof responseData['elements']>;
  const isEdge = (el: ElementDefinition) =>
    Boolean(el.data.source && el.data.target);
  const isNode = (el: ElementDefinition) => !isEdge(el);
  const isElligibleGroupNode = (el: ElementDefinition) => {
    if (isNode(el) && 'span.type' in el.data) {
      return isSpanGroupingSupported(el.data[SPAN_TYPE], el.data[SPAN_SUBTYPE]);
    }
    return false;
  };
  const nodes = responseData.elements.filter(isNode);
  const edges = responseData.elements.filter(isEdge);

  // create adjacency list by targets
  const groupNodeCandidates = responseData.elements
    .filter(isElligibleGroupNode)
    .map(({ data: { id } }) => id);
  const adjacencyListByTargetMap = new Map<string, string[]>();
  edges.forEach(({ data: { source, target } }) => {
    if (groupNodeCandidates.includes(target)) {
      const sources = adjacencyListByTargetMap.get(target);
      if (sources) {
        sources.push(source);
      } else {
        adjacencyListByTargetMap.set(target, [source]);
      }
    }
  });
  const adjacencyListByTarget = [...adjacencyListByTargetMap.entries()].map(
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
  const ungroupedEdges = [...edges];
  const ungroupedNodes = [...nodes];
  nodeGroups.forEach(({ sources, targets }) => {
    targets.forEach((target) => {
      // removes grouped nodes from original node set:
      const groupedNodeIndex = ungroupedNodes.findIndex(
        ({ data }) => data.id === target
      );
      ungroupedNodes.splice(groupedNodeIndex, 1);
      sources.forEach((source) => {
        // removes edges of grouped nodes from original edge set:
        const groupedEdgeIndex = ungroupedEdges.findIndex(
          ({ data }) => data.source === source && data.target === target
        );
        ungroupedEdges.splice(groupedEdgeIndex, 1);
      });
    });
  });

  // add in a composite node for each new group
  const groupedNodes = nodeGroups.map(({ id, targets }) => ({
    data: {
      id,
      'span.type': 'external',
      label: i18n.translate('xpack.apm.serviceMap.resourceCountLabel', {
        defaultMessage: '{count} resources',
        values: { count: targets.length },
      }),
      groupedConnections: targets
        .map((targetId) => {
          const targetElement = nodes.find(
            (element) => element.data.id === targetId
          );
          if (!targetElement) {
            return;
          }
          const { data } = targetElement;
          return { label: data.label || data.id, ...data };
        })
        .filter((node) => !!node),
    },
  }));

  // add new edges from source to new groups
  const groupedEdges: Array<{
    data: {
      id: string;
      source: string;
      target: string;
    };
  }> = [];
  nodeGroups.forEach(({ id, sources }) => {
    sources.forEach((source) => {
      groupedEdges.push({
        data: {
          id: `${source}~>${id}`,
          source,
          target: id,
        },
      });
    });
  });

  return {
    elements: [
      ...ungroupedNodes,
      ...groupedNodes,
      ...ungroupedEdges,
      ...groupedEdges,
    ],
  };
}
