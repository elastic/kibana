/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Takes an iterable input and a map function, outputs a new mapped array that removes
 * all `null` or `undefined` slots.
 */
export function compactMap<T, U>(array: Iterable<T>, mapFn: (val: T) => U | undefined | null): U[] {
  const mapped: U[] = [];

  for (const item of array) {
    const value = mapFn(item);

    if (value != null) {
      mapped.push(value);
    }
  }

  return mapped;
}
