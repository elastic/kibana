/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorInternal, ProcessorSelector } from './types';
import { DragAndDropSpecialLocations } from './constants';
import { State } from './processors_reducer';

type Path = string[];

/**
 * The below get and set functions are built with an API to make setting
 * and getting and setting values more simple.
 *
 * @remark
 * NEVER use these with objects that contain keys created by user input.
 */

/**
 * Given a path, get the value at the path
 *
 * @remark
 * If path is an empty array, return the source.
 */
export const getValue = <Result = any>(path: Path, source: any) => {
  let current = source;
  for (const key of path) {
    current = (current as any)[key];
  }
  return (current as unknown) as Result;
};

const ARRAY_TYPE = Object.prototype.toString.call([]);
const OBJECT_TYPE = Object.prototype.toString.call({});

const dumbCopy = <R>(value: R): R => {
  const objectType = Object.prototype.toString.call(value);
  if (objectType === ARRAY_TYPE) {
    return ([...(value as any)] as unknown) as R;
  } else if (objectType === OBJECT_TYPE) {
    return { ...(value as any) } as R;
  }

  throw new Error(`Expected (${ARRAY_TYPE}|${OBJECT_TYPE}) but received ${objectType}`);
};

const WHITELISTED_KEYS_REGEX = /^([0-9]+|onFailure|processors)$/;
/**
 * Given a path, value and an object (array or object) set
 * the value at the path and copy objects values on the
 * path only. This is a partial copy mechanism that is best
 * effort for providing state updates to the UI, could break down
 * if other updates are made to non-copied parts of state in external
 * references - but this should not happen.
 *
 * @remark
 * If path is empty, just shallow copy source.
 */
export const setValue = <Target = any, Value = any>(
  path: Path,
  source: Target,
  value: Value
): Target => {
  if (!path.length) {
    return dumbCopy(source);
  }

  let current: any;
  let result: Target;

  for (let idx = 0; idx < path.length; ++idx) {
    const key = path[idx];
    if (!WHITELISTED_KEYS_REGEX.test(key)) {
      // eslint-disable-next-line no-console
      console.error(
        `Received non-whitelisted key "${key}". Aborting set value operation; returning original.`
      );
      return dumbCopy(source);
    }
    const atRoot = !current;

    if (atRoot) {
      result = dumbCopy(source);
      current = result;
    }

    if (idx + 1 === path.length) {
      current[key] = value;
    } else {
      current[key] = dumbCopy(current[key]);
      current = current[key];
    }
  }

  return result!;
};

export const PARENT_CHILD_NEST_ERROR = 'PARENT_CHILD_NEST_ERROR';

export const checkIfSamePath = (pathA: ProcessorSelector, pathB: ProcessorSelector) => {
  if (pathA.length !== pathB.length) return false;
  return pathA.join('.') === pathB.join('.');
};

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
    const finalDestinationIndex = sourceIndex > destIndex ? destIndex : destIndex + 1;
    destinationProcessors.splice(finalDestinationIndex, 0, processor);
    const targetIdx = sourceIndex > destIndex ? sourceIndex + 1 : sourceIndex;
    sourceProcessors.splice(targetIdx, 1);
  }

  return { ...state, processors: [...state.processors], onFailure: [...state.onFailure] };
};
