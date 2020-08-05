/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { orderByTime } from '../process_event';
import { IndexedProcessTree } from '../../types';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { levelOrder as baseLevelOrder } from '../../lib/tree_sequencers';
import * as eventModel from '../../../../common/endpoint/models/event';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents.
 * siblings will be ordered by timestamp
 */
export function factory(
  // Array of processes to index as a tree
  processes: SafeResolverEvent[]
): IndexedProcessTree {
  const idToChildren = new Map<string | undefined, SafeResolverEvent[]>();
  const idToValue = new Map<string, SafeResolverEvent>();

  for (const process of processes) {
    const entityID: string | undefined = eventModel.entityIDSafeVersion(process);
    if (entityID !== undefined) {
      idToValue.set(entityID, process);

      const uniqueParentPid: string | undefined = eventModel.parentEntityIDSafeVersion(process);

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
export function children(
  tree: IndexedProcessTree,
  parentID: string | undefined
): SafeResolverEvent[] {
  const currentProcessSiblings = tree.idToChildren.get(parentID);
  return currentProcessSiblings === undefined ? [] : currentProcessSiblings;
}

/**
 * Get the indexed process event for the ID
 */
export function processEvent(tree: IndexedProcessTree, entityID: string): SafeResolverEvent | null {
  return tree.idToProcess.get(entityID) ?? null;
}

/**
 * Returns the parent ProcessEvent, if any, for the passed in `childProcess`
 */
export function parent(
  tree: IndexedProcessTree,
  childProcess: SafeResolverEvent
): SafeResolverEvent | undefined {
  const uniqueParentPid = eventModel.parentEntityIDSafeVersion(childProcess);
  if (uniqueParentPid === undefined) {
    return undefined;
  } else {
    return tree.idToProcess.get(uniqueParentPid);
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
  let current: SafeResolverEvent = tree.idToProcess.values().next().value;

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
    yield* baseLevelOrder(rootNode, (parentNode: SafeResolverEvent): SafeResolverEvent[] =>
      children(tree, eventModel.entityIDSafeVersion(parentNode))
    );
  }
}
