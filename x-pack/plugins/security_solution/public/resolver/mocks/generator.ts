/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EventStats,
  FieldsObject,
  NewResolverTree,
  ResolverNode,
  SafeResolverEvent,
} from '../../../common/endpoint/types';
import type { EventOptions } from '../../../common/endpoint/types/generator';
import type { Tree, TreeNode, TreeOptions, Event } from '../../../common/endpoint/generate_data';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import * as eventModel from '../../../common/endpoint/models/event';

/**
 * A structure for holding the generated tree.
 */
interface GeneratedTreeResponse {
  generatedTree: Tree;
  formattedTree: NewResolverTree;
  allNodes: Map<string, TreeNode>;
}

/**
 * Generates a tree consisting of endpoint data using the specified options.
 *
 * The returned object includes the tree in the raw form that is easier to navigate because it leverages maps and
 * the formatted tree that can be used wherever NewResolverTree is expected.
 *
 * @param treeOptions options for how the tree should be generated, like number of ancestors, descendants, etc
 */
export function generateTree(treeOptions?: TreeOptions): GeneratedTreeResponse {
  /**
   * The parameter to EndpointDocGenerator is used as a seed for the random number generated used internally by the
   * object. This means that the generator will return the same generated tree (ids, names, structure, etc) each
   * time the doc generate is used in tests. This way we can rely on the generate returning consistent responses
   * for our tests. The results won't be unpredictable and they will not result in flaky tests.
   */
  const generator = new EndpointDocGenerator('resolver');
  const generatedTree = generator.generateTree({
    ...treeOptions,
    // Force the tree generation to not randomize the number of children per node, it will always be the max specified
    // in the passed in options
    alwaysGenMaxChildrenPerNode: true,
  });

  const allNodes = new Map([
    [generatedTree.origin.id, generatedTree.origin],
    ...generatedTree.children,
    ...generatedTree.ancestry,
  ]);
  return {
    allNodes,
    generatedTree,
    formattedTree: formatTree(generatedTree),
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

/**
 * Builds a ResolverNode from an endpoint event.
 *
 * @param event an endpoint event
 * @param stats the related events stats to associate with the node
 */
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

/**
 * Creates a ResolverNode object.
 *
 * @param generator a document generator
 * @param options the configuration options to use when creating the node
 * @param stats the related events stats to associate with the node
 */
export function genResolverNode(
  generator: EndpointDocGenerator,
  options?: EventOptions,
  stats?: EventStats
) {
  return convertEventToResolverNode(generator.generateEvent(options), stats);
}

/**
 * Converts a generated Tree to the new resolver tree format.
 *
 * @param tree a generated tree.
 */
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
    originID: tree.origin.id,
  };
}
