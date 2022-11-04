/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicatorData } from '../../types/models';
import { toHighPrecision } from '../../utils/number';

export function computeSLI(sliData: IndicatorData): number {
  const { good, total } = sliData;
  if (total === 0) {
    return 0;
  }

  if (good >= total) {
    return 1;
  }

  return toHighPrecision(good / total);
}
