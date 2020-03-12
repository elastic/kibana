/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniquePidForProcess, uniqueParentPidForProcess } from './process_event';
import { IndexedProcessTree, ProcessEvent, AdjacentProcessMap } from '../types';
import { levelOrder as baseLevelOrder } from '../lib/tree_sequencers';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents
 */
export function factory(processes: ProcessEvent[]): IndexedProcessTree {
  const idToChildren = new Map<number | undefined, ProcessEvent[]>();
  const idToValue = new Map<number, ProcessEvent>();
  const idToAdjacent = new Map<number, AdjacentProcessMap>();

  for (const process of processes) {
    const uniqueProcessPid = uniquePidForProcess(process);
    idToValue.set(uniqueProcessPid, process);

    const uniqueParentPid = uniqueParentPidForProcess(process);
    const processChildren = idToChildren.get(uniqueParentPid);
    const adjacencyMapToUpdate: AdjacentProcessMap = idToAdjacent.get(uniqueProcessPid) || {
      self: uniqueProcessPid,
      up: null,
      down: null,
      previous: null,
      next: null,
    };

    if (processChildren) {
      processChildren.push(process);

      /**
       * Update adjacency maps for current and previous entries
       */
      const previousProcessId = uniquePidForProcess(processChildren[processChildren.length - 2]);
      const previousAdjacencyMap = idToAdjacent.get(previousProcessId) as AdjacentProcessMap;

      previousAdjacencyMap.next = uniqueProcessPid;
      idToAdjacent.set(previousProcessId, previousAdjacencyMap);
      adjacencyMapToUpdate.previous = previousProcessId;
      if (uniqueParentPid) {
        adjacencyMapToUpdate.up = uniqueParentPid;
      }
      idToAdjacent.set(uniqueProcessPid, adjacencyMapToUpdate);
    } else {
      idToChildren.set(uniqueParentPid, [process]);
      // set up, down
      if (uniqueParentPid) {
        const parentAdjacencyMap = idToAdjacent.get(uniqueParentPid) || {
          self: uniqueParentPid,
          up: null,
          down: null,
          previous: null,
          next: null,
        };
        parentAdjacencyMap.down = uniqueProcessPid;
        idToAdjacent.set(uniqueParentPid, parentAdjacencyMap);
        adjacencyMapToUpdate.up = uniqueParentPid;
        idToAdjacent.set(uniqueProcessPid, adjacencyMapToUpdate);
      }
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
export function children(tree: IndexedProcessTree, process: ProcessEvent): ProcessEvent[] {
  const id = uniquePidForProcess(process);
  const processChildren = tree.idToChildren.get(id);
  return processChildren === undefined ? [] : processChildren;
}

/**
 * Returns the parent ProcessEvent, if any, for the passed in `childProcess`
 */
export function parent(
  tree: IndexedProcessTree,
  childProcess: ProcessEvent
): ProcessEvent | undefined {
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
  let current: ProcessEvent = tree.idToProcess.values().next().value;
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
