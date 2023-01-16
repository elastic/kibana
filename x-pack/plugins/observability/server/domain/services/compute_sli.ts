/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicatorData } from '../models';
import { toHighPrecision } from '../../utils/number';

const NO_DATA = -1;

export function computeSLI(sliData: IndicatorData): number {
  const { good, total } = sliData;
  if (total === 0) {
    return NO_DATA;
  }

  if (good >= total) {
    return 1;
  }

  return toHighPrecision(good / total);
}
