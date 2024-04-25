/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';

const NO_DATA = -1;

export function computeSLI(good: number, total: number, totalSlicesInRange?: number): number {
  if (total === 0) {
    return NO_DATA;
  }

  // We calculate the sliValue based on the totalSlices in the dateRange, as
  // 1 - error rate observed = 1 - (1 - SLI Observed) = SLI
  if (totalSlicesInRange !== undefined && totalSlicesInRange > 0) {
    return toHighPrecision(1 - (total - good) / totalSlicesInRange);
  }

  return toHighPrecision(good / total);
}
