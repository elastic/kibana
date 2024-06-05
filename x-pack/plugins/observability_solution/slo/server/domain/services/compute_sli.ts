/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';

const NO_DATA = -1;

export function computeSLI(good: number, total: number, totalSlicesInRange?: number): number {
  // We calculate the sli based on the totalSlices in the dateRange, as
  // 1 - error rate observed = 1 - (1 - SLI Observed) = SLI
  // a slice without data will be considered as a good slice
  if (totalSlicesInRange !== undefined && totalSlicesInRange > 0) {
    return toHighPrecision(1 - (total - good) / totalSlicesInRange);
  }

  if (total === 0) {
    return NO_DATA;
  }

  return toHighPrecision(good / total);
}

export function computeSLIForPreview(good: number, total: number): number | null {
  const sliValue = computeSLI(good, total);

  if (sliValue === NO_DATA) {
    return null;
  }

  return sliValue;
}
