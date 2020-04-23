/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type Path = string[];

/**
 * The below get and set functions are built with an API to make setting
 * and get values from nested arrays a bit easier and more usable with
 * immer.
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

/**
 * Given a path, value and an object (array or object) set
 * the value at the path.
 *
 * @remark
 * If path is empty, do nothing
 */
export const setValue = <Target = any, Value = any>(
  path: Path,
  source: Target,
  value: Value
): void => {
  let current: any;

  if (!path.length) {
    return;
  }

  for (let idx = 0; idx < path.length; ++idx) {
    const key = path[idx];
    const atRoot = !current;

    if (atRoot) {
      current = source;
    }

    if (idx + 1 === path.length) {
      current[key] = value;
    } else {
      current = current[key];
    }
  }

  return;
};
