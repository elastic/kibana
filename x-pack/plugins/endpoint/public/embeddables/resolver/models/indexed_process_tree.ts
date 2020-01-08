/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniquePidForProcess, uniqueParentPidForProcess } from './process_event';
import { IndexedProcessTree, ProcessEvent } from '../types';

/**
 * Create a new `IndexedProcessTree`
 * TODO, what is this?
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
 * Returns true if the `childProcess` has no siblings
 */
export function isOnlyChild(tree: IndexedProcessTree, childProcess: ProcessEvent) {
  const parentProcess = parent(tree, childProcess);
  if (parentProcess === undefined) {
    // if parent process is undefined, then the child is the root. We choose not to support multiple roots
    return true;
  } else {
    return children(tree, parentProcess).length === 1;
  }
}
