/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { orderByTime } from '../process_event';
import { IndexedProcessTree } from '../../types';
import { ResolverNode } from '../../../../common/endpoint/types';
import { levelOrder as baseLevelOrder } from '../../lib/tree_sequencers';
import * as nodeModel from '../../../../common/endpoint/models/node';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents.
 * siblings will be ordered by timestamp
 */
export function factory(
  // Array of processes to index as a tree
  nodes: ResolverNode[],
  originId: string | undefined
): IndexedProcessTree {
  const idToChildren = new Map<string | undefined, ResolverNode[]>();
  const idToValue = new Map<string, ResolverNode>();

  for (const node of nodes) {
    const nodeId: string | undefined = nodeModel.nodeID(node);
    if (nodeId !== undefined) {
      idToValue.set(nodeId, node);

      const uniqueParentId: string | undefined = nodeModel.parentId(node);

      let childrenWithTheSameParent = idToChildren.get(uniqueParentId);
      if (!childrenWithTheSameParent) {
        childrenWithTheSameParent = [];
        idToChildren.set(uniqueParentId, childrenWithTheSameParent);
      }
      childrenWithTheSameParent.push(node);
    }
  }

  // sort the children of each node
  for (const siblings of idToChildren.values()) {
    siblings.sort(orderByTime);
  }

  return {
    idToChildren,
    idToNode: idToValue,
    originId,
  };
}

/**
 * Returns an array with any children `ProcessEvent`s of the passed in `process`
 */
export function children(tree: IndexedProcessTree, parentID: string | undefined): ResolverNode[] {
  const currentSiblings = tree.idToChildren.get(parentID);
  return currentSiblings === undefined ? [] : currentSiblings;
}

/**
 * Get the indexed process event for the ID
 */
export function treeNode(tree: IndexedProcessTree, entityID: string): ResolverNode | null {
  return tree.idToNode.get(entityID) ?? null;
}

/**
 * Returns the parent ProcessEvent, if any, for the passed in `childProcess`
 */
export function parent(
  tree: IndexedProcessTree,
  childNode: ResolverNode
): ResolverNode | undefined {
  const uniqueParentId = nodeModel.parentId(childNode);
  if (uniqueParentId === undefined) {
    return undefined;
  } else {
    return tree.idToNode.get(uniqueParentId);
  }
}

/**
 * Number of processes in the tree
 */
export function size(tree: IndexedProcessTree) {
  return tree.idToNode.size;
}

/**
 * Return the root process
 */
export function root(tree: IndexedProcessTree) {
  if (size(tree) === 0) {
    return null;
  }
  // any node will do
  let current: ResolverNode = tree.idToNode.values().next().value;

  // iteratively swap current w/ its parent
  while (parent(tree, current) !== undefined) {
    current = parent(tree, current)!;
  }
  return current;
}

/**
 * Yield processes in level order
 */
export function* levelOrder(tree: IndexedProcessTree) {
  const rootNode = root(tree);
  if (rootNode !== null) {
    yield* baseLevelOrder(rootNode, (parentNode: ResolverNode): ResolverNode[] =>
      children(tree, nodeModel.nodeID(parentNode))
    );
  }
}

/**
 * Returns the number of descendant nodes in the graph.
 */
export function countChildren(tree: IndexedProcessTree) {
  // The children map includes the origin, so remove that
  return !tree.originId ? 0 : tree.idToChildren.size - 1;
}

/**
 * Returns the number of ancestors nodes (including the origin) in the graph.
 */
export function countAncestors(tree: IndexedProcessTree) {
  if (!tree.originId) {
    return 0;
  }

  // include the origin
  let total = 1;
  let current: ResolverNode | undefined = tree.idToNode.get(tree.originId);
  while (current !== undefined && parent(tree, current) !== undefined) {
    total++;
    current = parent(tree, current);
  }
  return total;
}
