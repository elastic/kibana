/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function pullFromSet<T>(set: Set<T>, capacity: number) {
  if (capacity > 0 && set.size > 0) {
    const values = [];
    for (const value of set) {
      if (set.delete(value)) {
        values.push(value);
        if (values.length === capacity) {
          return values;
        }
      }
    }
    return values;
  }
  return [];
}
