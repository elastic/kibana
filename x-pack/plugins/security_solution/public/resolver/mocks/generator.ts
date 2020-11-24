/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EventStats,
  FieldsObject,
  NewResolverTree,
  ResolverNode,
  SafeResolverEvent,
} from '../../../common/endpoint/types';
import {
  EndpointDocGenerator,
  Tree,
  TreeNode,
  TreeOptions,
  Event,
  EventOptions,
} from '../../../common/endpoint/generate_data';
import * as eventModel from '../../../common/endpoint/models/event';

export interface GeneratedTreeResponse {
  genTree: Tree;
  tree: NewResolverTree;
  allNodes: Map<string, TreeNode>;
}

export function generateTree(treeOptions?: TreeOptions): GeneratedTreeResponse {
  const generator = new EndpointDocGenerator('resolver');
  const genTree = generator.generateTree({
    ...treeOptions,
    alwaysGenMaxChildrenPerNode: true,
  });

  const allNodes = new Map([
    [genTree.origin.id, genTree.origin],
    ...genTree.children,
    ...genTree.ancestry,
  ]);
  return {
    allNodes,
    genTree,
    tree: formatTree(genTree),
  };
}

/**
 * Builds a fields object style object from a generated event.
 *
 * @param {SafeResolverEvent} event a lifecycle event to convert into FieldObject style
 */
const buildFieldsObj = (event: Event): FieldsObject => {
  return {
    '@timestamp': eventModel.timestampSafeVersion(event) ?? 0,
    'process.entity_id': eventModel.entityIDSafeVersion(event) ?? '',
    'process.parent.entity_id': eventModel.parentEntityIDSafeVersion(event) ?? '',
    'process.name': eventModel.processNameSafeVersion(event) ?? '',
  };
};

export function convertEventToResolverNode(
  event: Event,
  stats: EventStats = { total: 0, byCategory: {} }
): ResolverNode {
  return {
    data: buildFieldsObj(event),
    id: eventModel.entityIDSafeVersion(event) ?? '',
    parent: eventModel.parentEntityIDSafeVersion(event),
    stats,
    name: eventModel.processNameSafeVersion(event),
  };
}

export function genResolverNode(
  generator: EndpointDocGenerator,
  options?: EventOptions,
  stats?: EventStats
) {
  return convertEventToResolverNode(generator.generateEvent(options), stats);
}

export function formatTree(tree: Tree): NewResolverTree {
  const allData = new Map([[tree.origin.id, tree.origin], ...tree.children, ...tree.ancestry]);

  /**
   * Creates an EventStats object from a generated TreeNOde.
   * @param node a TreeNode created by the EndpointDocGenerator
   */
  const buildStats = (node: TreeNode): EventStats => {
    return node.relatedEvents.reduce(
      (accStats: EventStats, event: SafeResolverEvent) => {
        accStats.total += 1;
        const categories = eventModel.eventCategory(event);
        if (categories.length > 0) {
          const category = categories[0];
          if (accStats.byCategory[category] === undefined) {
            accStats.byCategory[category] = 1;
          } else {
            accStats.byCategory[category] += 1;
          }
        }
        return accStats;
      },
      { total: 0, byCategory: {} }
    );
  };

  const treeResponse = Array.from(allData.values()).reduce(
    (acc: ResolverNode[], node: TreeNode) => {
      const lifecycleEvent = node.lifecycle[0];
      acc.push(convertEventToResolverNode(lifecycleEvent, buildStats(node)));
      return acc;
    },
    []
  );

  return {
    nodes: treeResponse,
    originId: tree.origin.id,
  };
}
