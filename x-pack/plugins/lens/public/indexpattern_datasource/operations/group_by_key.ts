/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function groupByKey<T>(
  items: T[],
  getKey: (item: T) => string | undefined
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  items.forEach((item) => {
    const key = getKey(item);
    if (key) {
      if (!(key in groups)) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
  });

  return groups;
}
