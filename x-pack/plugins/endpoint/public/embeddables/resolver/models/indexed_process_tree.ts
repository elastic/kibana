/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniquePidForProcess, uniqueParentPidForProcess } from './process_event';
import { IndexedProcessTree, AdjacentProcessMap, ResolverProcessEntityID } from '../types';
import { ResolverEvent } from '../../../../common/types';
import { levelOrder as baseLevelOrder } from '../lib/tree_sequencers';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents
 */
export function factory(processes: ResolverEvent[]): IndexedProcessTree {
  const idToChildren = new Map<string | undefined, ResolverEvent[]>();
  const idToValue = new Map<string, ResolverEvent[]>();
  const idToAdjacent = new Map<string, AdjacentProcessMap>();

  function emptyAdjacencyMap(id: string): AdjacentProcessMap {
    return {
      self: id,
      parent: null,
      firstChild: null,
      previousSibling: null,
      nextSibling: null,
      level: 1,
    };
  }

  const roots: ResolverEvent[] = [];

  for (const process of processes) {
    const uniqueProcessPid = uniquePidForProcess(process);
    const existingValue = idToValue.get(uniqueProcessPid);
    if (existingValue) {
      existingValue.push(process);
    } else {
      idToValue.set(uniqueProcessPid, [process]);
    }

    const currentProcessAdjacencyMap: AdjacentProcessMap =
      idToAdjacent.get(uniqueProcessPid) || emptyAdjacencyMap(uniqueProcessPid);
    idToAdjacent.set(uniqueProcessPid, currentProcessAdjacencyMap);

    const uniqueParentPid = uniqueParentPidForProcess(process);
    const currentProcessSiblings = idToChildren.get(uniqueParentPid);

    if (currentProcessSiblings) {
      const previousProcessId = uniquePidForProcess(
        currentProcessSiblings[currentProcessSiblings.length - 1]
      );
      currentProcessSiblings.push(process);
      /**
       * Update adjacency maps for current and previous entries
       */
      idToAdjacent.get(previousProcessId)!.nextSibling = uniqueProcessPid;
      currentProcessAdjacencyMap.previousSibling = previousProcessId;
      if (uniqueParentPid) {
        currentProcessAdjacencyMap.parent = uniqueParentPid;
      }
    } else {
      idToChildren.set(uniqueParentPid, [process]);

      if (uniqueParentPid) {
        /**
         * Get the parent's map, otherwise set an empty one
         */
        const parentAdjacencyMap =
          idToAdjacent.get(uniqueParentPid) ||
          (idToAdjacent.set(uniqueParentPid, emptyAdjacencyMap(uniqueParentPid)),
          idToAdjacent.get(uniqueParentPid))!;
        // set firstChild for parent
        parentAdjacencyMap.firstChild = uniqueProcessPid;
        // set parent for current
        currentProcessAdjacencyMap.parent = uniqueParentPid || null;
      } else {
        // In this case (no unique parent id), it must be a root
        roots.push(process);
      }
    }
  }

  /**
   * Scan adjacency maps from the top down and assign levels
   */
  function traverseLevels(currentProcessMap: AdjacentProcessMap, level: number = 1): void {
    const nextLevel = level + 1;
    if (currentProcessMap.nextSibling) {
      traverseLevels(idToAdjacent.get(currentProcessMap.nextSibling)!, level);
    }
    if (currentProcessMap.firstChild) {
      traverseLevels(idToAdjacent.get(currentProcessMap.firstChild)!, nextLevel);
    }
    currentProcessMap.level = level;
  }

  for (const treeRoot of roots) {
    traverseLevels(idToAdjacent.get(uniquePidForProcess(treeRoot))!);
  }

  return {
    idToChildren,
    idToProcess: idToValue,
    idToAdjacent,
  };
}

/**
 * Returns an array with any children `ProcessEvent`s of the passed in `process`
 */
export function children(
  tree: IndexedProcessTree,
  entityID: ResolverProcessEntityID
): ResolverEvent[] {
  const currentProcessSiblings = tree.idToChildren.get(entityID);
  return currentProcessSiblings === undefined ? [] : currentProcessSiblings;
}

// TODO, this order is important. when we do this, the adjaceny map will be incorrect i think
export function childrenEntityIDs(
  tree: IndexedProcessTree,
  entityID: ResolverProcessEntityID
): ResolverProcessEntityID[] {
  const seen: Set<ResolverProcessEntityID> = new Set();
  const childrenIDs: ResolverProcessEntityID[] = [];
  for (const childProcess of children(tree, entityID)) {
    const childEntityID = uniquePidForProcess(childProcess);
    if (seen.has(childEntityID)) {
      continue;
    } else {
      seen.add(childEntityID);
    }
    childrenIDs.push(childEntityID);
  }
  return childrenIDs;
}

/**
 * Returns the parent ProcessEvent, if any, for the passed in `childProcess`
 */
export function parentEvents(
  tree: IndexedProcessTree,
  childProcess: ResolverEvent
): ResolverEvent[] {
  const uniqueParentPid = uniqueParentPidForProcess(childProcess);
  if (uniqueParentPid === undefined) {
    return [];
  } else {
    return tree.idToProcess.get(uniqueParentPid) ?? [];
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
function root(tree: IndexedProcessTree): ResolverProcessEntityID | null {
  if (size(tree) === 0) {
    return null;
  }
  let current: ResolverEvent = tree.idToProcess.values().next().value;
  while (parentEvents(tree, current) !== undefined) {
    current = parentEvents(tree, current)[0]!;
  }
  return uniquePidForProcess(current);
}

/**
 * Yield processes in level order
 */
export function* levelOrder(tree: IndexedProcessTree): Iterable<ResolverProcessEntityID> {
  const rootNode: ResolverProcessEntityID | null = root(tree);
  if (rootNode !== null) {
    yield* baseLevelOrder(rootNode, parentEntityID => [...childrenEntityIDs(tree, parentEntityID)]);
  }
}

export function parentForEntityID(
  tree: IndexedProcessTree,
  entityID: ResolverProcessEntityID
): ResolverProcessEntityID | undefined {
  const process = tree.idToProcess.get(entityID);
  if (process === undefined || process.length === 0) {
    return undefined;
  }
  return uniqueParentPidForProcess(process[0]);
}
