/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeBurnRate } from './compute_burn_rate';
import { toDateRange } from './date_range';
import { createSLO } from '../../services/fixtures/slo';
import { ninetyDaysRolling } from '../../services/fixtures/time_window';

describe('computeBurnRate', () => {
  it('computes 0 when total is 0', () => {
    expect(
      computeBurnRate(createSLO(), {
        good: 10,
        total: 0,
        dateRange: toDateRange(ninetyDaysRolling()),
      })
    ).toEqual(0);
  });

  it('computes 0 when good is greater than total', () => {
    expect(
      computeBurnRate(createSLO(), {
        good: 9999,
        total: 1,
        dateRange: toDateRange(ninetyDaysRolling()),
      })
    ).toEqual(0);
  });

  it('computes the burn rate as 1x the error budget', () => {
    expect(
      computeBurnRate(createSLO({ objective: { target: 0.9 } }), {
        good: 90,
        total: 100,
        dateRange: toDateRange(ninetyDaysRolling()),
      })
    ).toEqual(1);
  });

  it('computes the burn rate as 10x the error budget', () => {
    expect(
      computeBurnRate(createSLO({ objective: { target: 0.99 } }), {
        good: 90,
        total: 100,
        dateRange: toDateRange(ninetyDaysRolling()),
      })
    ).toEqual(10);
  });

  it('computes the burn rate as 0.5x the error budget', () => {
    expect(
      computeBurnRate(createSLO({ objective: { target: 0.8 } }), {
        good: 90,
        total: 100,
        dateRange: toDateRange(ninetyDaysRolling()),
      })
    ).toEqual(0.5);
  });
});
