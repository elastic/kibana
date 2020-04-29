/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DraggableLocation, ProcessorInternal } from './types';

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
  processors: ProcessorInternal[],
  source: DraggableLocation,
  destination: DraggableLocation
) => {
  // Start by setting up references to objects of interest using our selectors
  // At this point, our selectors are consistent with the data passed in.
  const sourceProcessors = getValue<ProcessorInternal[]>(source.selector, processors);
  const destinationProcessors = getValue<ProcessorInternal[]>(destination.selector, processors);
  const processor = sourceProcessors[source.index];
  const sourceProcessor = getValue<ProcessorInternal>(source.selector.slice(0, -1), processors);

  // First perform the add operation.
  if (destinationProcessors) {
    destinationProcessors.splice(destination.index, 0, processor);
  } else {
    const targetProcessor = getValue<ProcessorInternal>(
      destination.selector.slice(0, -1),
      processors
    );
    targetProcessor.onFailure = [processor];
  }

  // !! Beyond this point, selectors are no longer usable because we have mutated the data structure!

  // Second, we perform the deletion operation
  sourceProcessors.splice(source.index, 1);
  // If onFailure is empty, delete the array.
  if (!sourceProcessors.length) {
    sourceProcessor.onFailure = undefined;
  }

  return [...processors];
};
