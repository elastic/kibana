/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*********************************************************************************************
 * General utility functions.
 *********************************************************************************************/

export interface ChunkResult<T> {
  category: string;
  values: T[];
}

/**
 * Similar to lodash chunk, but categorizes the chunks. For example:
 *
 * chunkBy(({ type }) => type, [{ type: 'a' }, { type: 'a' }, { type: 'b' }, { type: 'a' }])
 *
 * Returns [
 *   { category: 'a', values: [{ type: 'a' }, { type: 'a' }] },
 *   { category: 'b', values: [{ type: 'b' }] },
 *   { category: 'a', values: [{ type: 'a' }] },
 * ]
 */
export function chunkBy<T>(fn: (x: T) => any, arr: T[]): Array<ChunkResult<T>> {
  const result: Array<ChunkResult<T>> = [];
  let category = '';
  let values: T[] = [];
  const pushCategory = () => {
    if (values.length) {
      result.push({ category, values });
      values = [];
    }
  };

  for (const x of arr) {
    const value = fn(x);

    if (value !== category) {
      pushCategory();
    }

    category = value;
    values.push(x);
  }

  pushCategory();

  return result;
}

/**
 * Shallow flatten an array
 */
export function flatten<T>(arr: T[] | T[][]): T[] {
  return Array.prototype.concat.apply([], arr);
}

/**
 * Determine if x is null, undefined, [], {}
 */
export function isEmpty(x: any) {
  return x == null || (Array.isArray(x) && x.length === 0) || Object.keys(x).length === 0;
}

/**
 * Partition an array based on the specified predicate.
 */
export function partition<T>(fn: (x: T) => boolean, arr: T[]): T[][] {
  const a: T[] = [];
  const b: T[] = [];

  (arr || []).forEach(x => (fn(x) ? a.push(x) : b.push(x)));

  return [a, b];
}

/**
 * Return the first item of the array, if array is defined.
 */
export function first<T>(xs: T[]) {
  return xs ? xs[0] : undefined;
}
