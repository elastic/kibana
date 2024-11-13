/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Status } from './burn_rate_status';

export function getStatus(
  threshold: number,
  longWindowBurnRate: number,
  shortWindowBurnRate: number
): Status {
  const isLongWindowBurnRateAboveThreshold = longWindowBurnRate > threshold;
  const isShortWindowBurnRateAboveThreshold = shortWindowBurnRate > threshold;
  const areBothBurnRatesAboveThreshold =
    isLongWindowBurnRateAboveThreshold && isShortWindowBurnRateAboveThreshold;

  return areBothBurnRatesAboveThreshold
    ? 'BREACHED'
    : isLongWindowBurnRateAboveThreshold && !isShortWindowBurnRateAboveThreshold
    ? 'RECOVERING'
    : !isLongWindowBurnRateAboveThreshold && isShortWindowBurnRateAboveThreshold
    ? 'INCREASING'
    : 'ACCEPTABLE';
}
