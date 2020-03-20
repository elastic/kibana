/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniquePidForProcess, uniqueParentPidForProcess } from './process_event';
import { IndexedProcessTree, AdjacentProcessMap } from '../types';
import { ResolverEvent } from '../../../../common/types';
import { levelOrder as baseLevelOrder } from '../lib/tree_sequencers';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents
 */
export function factory(processes: ResolverEvent[]): IndexedProcessTree {
  const idToChildren = new Map<string | undefined, ResolverEvent[]>();
  const idToValue = new Map<string, ResolverEvent>();
  const idToAdjacent = new Map<string, AdjacentProcessMap>();

  for (const process of processes) {
    const uniqueProcessPid = uniquePidForProcess(process);
    idToValue.set(uniqueProcessPid, process);

    const uniqueParentPid = uniqueParentPidForProcess(process);
    const processChildren = idToChildren.get(uniqueParentPid);
    function emptyAdjacencyMap(id: string): AdjacentProcessMap {
      return {
        self: id,
        parent: null,
        firstChild: null,
        previousSibling: null,
        nextSibling: null,
        get level(): number {
          if (!this.parent) {
            return 1;
          }
          const mapAbove = idToAdjacent.get(this.parent!);
          return mapAbove ? mapAbove.level + 1 : 1;
        },
      };
    }
    const parentAdjacencyMap =
      (uniqueParentPid && idToAdjacent.get(uniqueParentPid)) ||
      emptyAdjacencyMap(uniqueParentPid || 'root');
    const currentProcessAdjacencyMap: AdjacentProcessMap =
      idToAdjacent.get(uniqueProcessPid) || emptyAdjacencyMap(uniqueProcessPid);

    if (processChildren) {
      const previousProcessId = uniquePidForProcess(processChildren[processChildren.length - 1]);

      processChildren.push(process);

      /**
       * Update adjacency maps for current and previous entries
       */
      const previousAdjacencyMap = idToAdjacent.get(previousProcessId) as AdjacentProcessMap;

      previousAdjacencyMap.nextSibling = uniqueProcessPid;
      idToAdjacent.set(previousProcessId, previousAdjacencyMap);
      currentProcessAdjacencyMap.previousSibling = previousProcessId;
      if (uniqueParentPid) {
        currentProcessAdjacencyMap.parent = uniqueParentPid;
      }
      idToAdjacent.set(uniqueProcessPid, currentProcessAdjacencyMap);
    } else {
      idToChildren.set(uniqueParentPid, [process]);

      // set up, down
      if (uniqueParentPid) {
        parentAdjacencyMap.firstChild = uniqueProcessPid;
        idToAdjacent.set(uniqueParentPid, parentAdjacencyMap);
      }
      currentProcessAdjacencyMap.parent = uniqueParentPid || null;
      idToAdjacent.set(uniqueProcessPid, currentProcessAdjacencyMap);
    }
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
export function children(tree: IndexedProcessTree, process: ResolverEvent): ResolverEvent[] {
  const id = uniquePidForProcess(process);
  const processChildren = tree.idToChildren.get(id);
  return processChildren === undefined ? [] : processChildren;
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
  let current: ResolverEvent = tree.idToProcess.values().next().value;
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
