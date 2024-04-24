/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';

export function computeSLI(good: number, total: number): number | null {
  if (total === 0) {
    return null;
  }

  return toHighPrecision(good / total);
}
