/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sevenDaysRolling } from '../../../services/fixtures/time_window';
import { formatTimeToExhaustErrorBudgetInHours } from './utils';

describe('computeTimeToExhaustErrorBudgetInHours', () => {
  it('computes the time to exhaust the error budget in hours', () => {
    expect(formatTimeToExhaustErrorBudgetInHours(0, sevenDaysRolling())).toBe(0);
    expect(formatTimeToExhaustErrorBudgetInHours(1, sevenDaysRolling())).toBe(168);
    expect(formatTimeToExhaustErrorBudgetInHours(2, sevenDaysRolling())).toBe(84);
    expect(formatTimeToExhaustErrorBudgetInHours(10, sevenDaysRolling())).toBe(16.8);
  });
});
