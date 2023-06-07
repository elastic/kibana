/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeBurnRate } from './compute_burn_rate';
import { toDateRange } from './date_range';
import { createSLO } from '../../services/slo/fixtures/slo';
import { sixHoursRolling } from '../../services/slo/fixtures/time_window';
import { computeSLI } from './compute_sli';

describe('computeBurnRate', () => {
  it('computes 0 when total is 0', () => {
    expect(
      computeBurnRate(createSLO(), {
        dateRange: toDateRange(sixHoursRolling()),
        sli: computeSLI(10, 0),
      })
    ).toEqual(0);
  });

  it('computes 0 when good is greater than total', () => {
    expect(
      computeBurnRate(createSLO(), {
        dateRange: toDateRange(sixHoursRolling()),
        sli: computeSLI(9999, 1),
      })
    ).toEqual(0);
  });

  it('computes the burn rate as 1x the error budget', () => {
    expect(
      computeBurnRate(createSLO({ objective: { target: 0.9 } }), {
        dateRange: toDateRange(sixHoursRolling()),
        sli: computeSLI(90, 100),
      })
    ).toEqual(1);
  });

  it('computes the burn rate as 10x the error budget', () => {
    expect(
      computeBurnRate(createSLO({ objective: { target: 0.99 } }), {
        dateRange: toDateRange(sixHoursRolling()),
        sli: computeSLI(90, 100),
      })
    ).toEqual(10);
  });

  it('computes the burn rate as 0.5x the error budget', () => {
    expect(
      computeBurnRate(createSLO({ objective: { target: 0.8 } }), {
        dateRange: toDateRange(sixHoursRolling()),
        sli: computeSLI(90, 100),
      })
    ).toEqual(0.5);
  });
});
