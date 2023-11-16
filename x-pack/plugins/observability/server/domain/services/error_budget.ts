/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toHighPrecision } from '../../utils/number';
import { ErrorBudget } from '../models';

export function toErrorBudget(
  initial: number,
  consumed: number,
  isEstimated: boolean = false
): ErrorBudget {
  return {
    initial: toHighPrecision(initial),
    consumed: toHighPrecision(consumed),
    remaining: toHighPrecision(1 - consumed),
    isEstimated,
  };
}
