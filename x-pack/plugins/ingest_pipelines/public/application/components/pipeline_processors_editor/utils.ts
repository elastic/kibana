/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessorSelector } from './types';

export const selectorToDataTestSubject = (selector: ProcessorSelector) => selector.join('>');

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

export const checkIfSamePath = (pathA: ProcessorSelector, pathB: ProcessorSelector) => {
  if (pathA.length !== pathB.length) return false;
  return pathA.join('.') === pathB.join('.');
};
