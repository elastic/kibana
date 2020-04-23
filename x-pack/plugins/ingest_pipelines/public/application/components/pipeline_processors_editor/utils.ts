/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type Path = string[];

/**
 * The below getter and setter functions are the immutable counter-parts to
 * lodash's `get` and `set` functions. They are built specifically to get and
 * set values with arrays that contain objects that contain arrays.
 *
 * 'immer' + lodash was attempted (as this would in theory provide the same
 * result) but resulted in an issue with updating the array in place. 'immer'
 * can also result in a high performance spike and is NOT call-stack safe.
 *
 * @remark
 * NEVER use these with objects that contain keys created by user input.
 */

export const getValue = <Result = any>(path: Path, source: any) => {
  let current = source;
  for (const key of path) {
    current = (current as any)[key];
  }
  return (current as unknown) as Result;
};

const ARRAY = '[object Array]';
const OBJECT = '[object Object]';

const copy = (value: unknown): any => {
  const result = Object.prototype.toString.call(value);
  if (result === ARRAY) {
    return [...(value as any[])];
  }
  if (result === OBJECT) {
    return { ...(value as object) };
  }
  throw Error(`Unrecognized type ${result}`);
};

export const setValue = <Target = any, Value = any>(path: Path, source: Target, value: Value) => {
  let current: any;
  let result: Value;

  for (let idx = 0; idx < path.length; ++idx) {
    const key = path[idx];
    const atRoot = !current;

    if (atRoot) {
      result = copy(source);
      current = result;
    }

    if (idx + 1 === path.length) {
      current[key] = value;
    } else {
      current[key] = copy(current[key]);
      current = current[key];
    }
  }

  return result!;
};
