/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexMap, Index } from './types';

export const comparator = (v1: number, v2: number) => {
  if (v1 < v2) {
    return 1;
  }
  return v1 > v2 ? -1 : 0;
};

export function timeInMilliseconds(data: any): number {
  if (data.time_in_nanos) {
    return data.time_in_nanos / 1000000;
  }

  if (typeof data.time === 'string') {
    return Number(data.time.replace('ms', ''));
  }

  return Number(data.time);
}

export function calcTimes(data: any[], parentId?: string) {
  let totalTime = 0;
  // First pass to collect total
  for (const child of data) {
    totalTime += timeInMilliseconds(child);
  }
  return totalTime;
}

export const sortIndices = (data: IndexMap) => {
  const sortedIndices: Index[] = [];
  for (const index of Object.values(data)) {
    sortedIndices.push(index);
  }
  // And now sort the indices themselves
  sortedIndices.sort((a, b) => comparator(a.time, b.time));
  return sortedIndices;
};
