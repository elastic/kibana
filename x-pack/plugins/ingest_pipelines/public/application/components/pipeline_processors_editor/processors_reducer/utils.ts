/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State } from './processors_reducer';
import { ProcessorInternal, ProcessorSelector } from '../types';
import { DragAndDropSpecialLocations } from '../constants';
import { checkIfSamePath, getValue } from '../utils';

export const PARENT_CHILD_NEST_ERROR = 'PARENT_CHILD_NEST_ERROR';

/**
 * Unsafe!
 *
 * This function takes a data structure and mutates it in place.
 *
 * It is convenient for updating the processors (see {@link ProcessorInternal})
 * structure in this way because the structure is recursive. We are moving processors between
 * different arrays, removing in one, and adding to another. The end result should be consistent
 * with these actions.
 *
 * @remark
 * This function assumes parents cannot be moved into themselves.
 */
export const unsafeProcessorMove = (
  state: State,
  source: ProcessorSelector,
  destination: ProcessorSelector
): State => {
  const pathToSourceArray = source.slice(0, -1);
  const pathToDestArray = destination.slice(0, -1);
  if (source.every((pathSegment, idx) => pathSegment === destination[idx])) {
    throw new Error(PARENT_CHILD_NEST_ERROR);
  }
  const isXArrayMove = !checkIfSamePath(pathToSourceArray, pathToDestArray);

  // Start by setting up references to objects of interest using our selectors
  // At this point, our selectors are consistent with the data passed in.
  const sourceProcessors = getValue<ProcessorInternal[]>(pathToSourceArray, state);
  const destinationProcessors = getValue<ProcessorInternal[]>(pathToDestArray, state);
  const sourceIndex = parseInt(source[source.length - 1], 10);
  const sourceProcessor = getValue<ProcessorInternal>(pathToSourceArray.slice(0, -1), state);
  const processor = sourceProcessors[sourceIndex];

  const lastDestItem = destination[destination.length - 1];
  let destIndex: number;
  if (lastDestItem === DragAndDropSpecialLocations.top) {
    destIndex = 0;
  } else if (lastDestItem === DragAndDropSpecialLocations.bottom) {
    destIndex = Infinity;
  } else if (/^[0-9]+$/.test(lastDestItem)) {
    destIndex = parseInt(lastDestItem, 10);
  } else {
    throw new Error(`Expected number but received "${lastDestItem}"`);
  }

  if (isXArrayMove) {
    // First perform the add operation.
    if (destinationProcessors) {
      destinationProcessors.splice(destIndex, 0, processor);
    } else {
      const targetProcessor = getValue<ProcessorInternal>(pathToDestArray.slice(0, -1), state);
      targetProcessor.onFailure = [processor];
    }
    // !! Beyond this point, selectors are no longer usable because we have mutated the data structure!
    // Second, we perform the deletion operation
    sourceProcessors.splice(sourceIndex, 1);

    // If onFailure is empty, delete the array.
    if (!sourceProcessors.length && !((sourceProcessor as unknown) as State).isRoot) {
      sourceProcessor.onFailure = undefined;
    }
  } else {
    destinationProcessors.splice(destIndex, 0, processor);
    const targetIdx = sourceIndex > destIndex ? sourceIndex + 1 : sourceIndex;
    sourceProcessors.splice(targetIdx, 1);
  }

  return { ...state, processors: [...state.processors], onFailure: [...state.onFailure] };
};
