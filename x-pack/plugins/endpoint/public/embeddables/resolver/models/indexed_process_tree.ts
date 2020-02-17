/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniquePidForProcess, uniqueParentPidForProcess } from './process_event';
import { IndexedProcessTree, ProcessEvent } from '../types';
import { levelOrder as baseLevelOrder } from '../lib/tree_sequencers';

/**
 * Create a new IndexedProcessTree from an array of ProcessEvents
 */
export function factory(processes: ProcessEvent[]): IndexedProcessTree {
  const idToChildren = new Map<number | undefined, ProcessEvent[]>();
  const idToValue = new Map<number, ProcessEvent>();

  for (const process of processes) {
    idToValue.set(uniquePidForProcess(process), process);
    const uniqueParentPid = uniqueParentPidForProcess(process);
    const processChildren = idToChildren.get(uniqueParentPid);
    if (processChildren) {
      processChildren.push(process);
    } else {
      idToChildren.set(uniqueParentPid, [process]);
    }
  }

  return {
    idToChildren,
    idToProcess: idToValue,
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
