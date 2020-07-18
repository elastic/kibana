/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-shadow */

import { uniquePidForProcess, uniqueParentPidForProcess, orderByTime } from '../process_event';
import { IndexedProcessTree } from '../../types';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { levelOrder as baseLevelOrder } from '../../lib/tree_sequencers';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents.
 * siblings will be ordered by timestamp
 */
export function factory(
  // Array of processes to index as a tree
  processes: ResolverEvent[]
): IndexedProcessTree {
  const idToChildren = new Map<string | undefined, ResolverEvent[]>();
  const idToValue = new Map<string, ResolverEvent>();

  for (const process of processes) {
    const uniqueProcessPid = uniquePidForProcess(process);
    idToValue.set(uniqueProcessPid, process);

    const uniqueParentPid = uniqueParentPidForProcess(process);
    // if its defined and not ''
    if (uniqueParentPid) {
      let childrenWithTheSameParent = idToChildren.get(uniqueParentPid);
      if (!childrenWithTheSameParent) {
        childrenWithTheSameParent = [];
        idToChildren.set(uniqueParentPid, childrenWithTheSameParent);
      }
      childrenWithTheSameParent.push(process);
    }
  }

  // sort the children of each node
  for (const siblings of idToChildren.values()) {
    siblings.sort(orderByTime);
  }

  return {
    idToChildren,
    idToProcess: idToValue,
  };
}

/**
 * Returns an array with any children `ProcessEvent`s of the passed in `process`
 */
export function children(tree: IndexedProcessTree, parentID: string | undefined): ResolverEvent[] {
  const currentProcessSiblings = tree.idToChildren.get(parentID);
  return currentProcessSiblings === undefined ? [] : currentProcessSiblings;
}

/**
 * Get the indexed process event for the ID
 */
export function processEvent(tree: IndexedProcessTree, entityID: string): ResolverEvent | null {
  return tree.idToProcess.get(entityID) ?? null;
}

/**
 * Returns the parent ProcessEvent, if any, for the passed in `childProcess`
 */
export function parent(
  tree: IndexedProcessTree,
  childProcess: ResolverEvent
): ResolverEvent | undefined {
  const uniqueParentPid = uniqueParentPidForProcess(childProcess);
  if (uniqueParentPid === undefined) {
    return undefined;
  } else {
    return tree.idToProcess.get(uniqueParentPid);
  }
}

/**
 * Returns the following sibling
 */
export function siblings(tree: IndexedProcessTree, node: ResolverEvent): ResolverEvent[] {
  // this can be undefined, since a node may have no parent.
  const parentID: string | undefined = uniqueParentPidForProcess(node);

  // nodes with the same parent ID.
  // if `node` has no parent ID, this is nodes with no parent ID.
  const childrenWithTheSameParent: undefined | ResolverEvent[] = tree.idToChildren.get(parentID);

  // this shouldn't happen if the node was in `tree`.
  if (!childrenWithTheSameParent) {
    return [];
  }

  // Return all children with the same parent as `node`, except `node` itself.
  return [...childrenWithTheSameParent.filter((child) => child !== node)];
}

/**
 * Number of processes in the tree
 */
export function size(tree: IndexedProcessTree) {
  return tree.idToProcess.size;
}

/**
 * Return the root process
 */
export function root(tree: IndexedProcessTree) {
  if (size(tree) === 0) {
    return null;
  }
  // any node will do
  let current: ResolverEvent = tree.idToProcess.values().next().value;

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
    yield* baseLevelOrder(rootNode, (parentNode: ResolverEvent): ResolverEvent[] =>
      children(tree, uniquePidForProcess(parentNode))
    );
  }
}
