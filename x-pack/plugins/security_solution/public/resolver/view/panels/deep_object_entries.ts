/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/**
 * Sort of like object entries, but does a DFS of an object.
 * Instead of getting a key, an array of keys is returned.
 * The array of keys represents the path to the value.
 * `undefined` and `null` values are omitted.
 */
export function deepObjectEntries(root: object): Array<[path: string[], value: unknown]> {
  const queue: Array<{ path: string[]; value: unknown }> = [{ path: [], value: root }];
  const result: Array<[path: string[], value: unknown]> = [];
  while (queue.length) {
    const next = queue.shift();
    if (next === undefined) {
      // this should be impossible
      throw new Error();
    }
    const { path, value } = next;
    if (Array.isArray(value)) {
      // branch on arrays
      queue.push(
        ...value.map((element) => ({
          path: [...path], // unlike with object paths, don't add the number indices to `path`
          value: element,
        }))
      );
    } else if (typeof value === 'object' && value !== null) {
      // branch on non-null objects
      queue.push(
        ...Object.keys(value).map((key) => ({
          path: [...path, key],
          value: (value as Record<string, unknown>)[key],
        }))
      );
    } else if (value !== undefined && value !== null) {
      // emit other non-null, defined, values
      result.push([path, value]);
    }
  }
  return result;
}
