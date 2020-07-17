/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
      let siblings = idToChildren.get(uniqueParentPid);
      if (!siblings) {
        siblings = [];
        idToChildren.set(uniqueParentPid, siblings);
      }
      siblings.push(process);
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
export function children(tree: IndexedProcessTree, process: ResolverEvent): ResolverEvent[] {
  const id = uniquePidForProcess(process);
  const currentProcessSiblings = tree.idToChildren.get(id);
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
export function nextSibling(
  tree: IndexedProcessTree,
  sibling: ResolverEvent
): ResolverEvent | undefined {
  const parentNode = parent(tree, sibling);
  if (parentNode) {
    // The siblings of `sibling` are the children of its parent.
    const siblings = children(tree, parentNode);

    // Find the sibling
    const index = siblings.indexOf(sibling);

    // if the sibling wasn't found, or if it was the last element in the array, return undefined
    if (index === -1 || index === siblings.length - 1) {
      return undefined;
    }

    // return the next sibling
    return siblings[index + 1];
  }
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
    yield* baseLevelOrder(rootNode, children.bind(null, tree));
  }
}
