/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeWindow } from '../../../domain/models';
import { toHighPrecision } from '../../../utils/number';

export function formatTimeToExhaustErrorBudgetInHours(
  burnRate: number,
  timeWindow: TimeWindow
): number {
  if (burnRate <= 0) {
    return 0;
  }

  return toHighPrecision(timeWindow.duration.asHours() / burnRate);
}
