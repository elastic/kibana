/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Groups an array of items by a key extracted from each item.
 *
 * @param collection - Array of items to group
 * @param keyGetter - Function that extracts the grouping key from each item
 * @returns Object with keys being the extracted values and values being arrays of items
 *
 * @example
 * const items = [
 *   { id: '1', type: 'A' },
 *   { id: '2', type: 'B' },
 *   { id: '3', type: 'A' }
 * ];
 * const grouped = groupBy(items, item => item.type);
 * // Result: { A: [{ id: '1', type: 'A' }, { id: '3', type: 'A' }], B: [{ id: '2', type: 'B' }] }
 */
export function groupBy<T, K extends PropertyKey>(
  collection: T[],
  keyGetter: (item: T) => K
): Record<K, T[]> {
  return collection.reduce((acc, item) => {
    const key = keyGetter(item);

    if (acc[key] === undefined) {
      acc[key] = [];
    }

    acc[key].push(item);

    return acc;
  }, {} as Record<K, T[]>);
}
