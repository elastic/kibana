/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';

const NO_DATA = -1;

export function computeSLI(good: number, total: number, nullAsNoData?: boolean): number | null {
  if (total === 0) {
    return nullAsNoData ? null : NO_DATA;
  }

  return toHighPrecision(good / total);
}
