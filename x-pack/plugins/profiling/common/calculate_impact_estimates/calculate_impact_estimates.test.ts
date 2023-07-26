/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { calculateImpactEstimates } from '.';

describe('calculateImpactEstimates', () => {
  it('calculates impact when countExclusive is lower than countInclusive', () => {
    expect(
      calculateImpactEstimates({
        countExclusive: 500,
        countInclusive: 1000,
        totalSamples: 10000,
        totalSeconds: 15 * 60, // 15m
      })
    ).toEqual({
      annualizedCo2: 17.909333333333336,
      annualizedCo2NoChildren: 8.954666666666668,
      annualizedCoreSeconds: 1752000,
      annualizedCoreSecondsNoChildren: 876000,
      annualizedDollarCost: 20.683333333333334,
      annualizedDollarCostNoChildren: 10.341666666666667,
      co2: 0.0005111111111111112,
      co2NoChildren: 0.0002555555555555556,
      coreSeconds: 50,
      coreSecondsNoChildren: 25,
      dollarCost: 0.0005902777777777778,
      dollarCostNoChildren: 0.0002951388888888889,
      percentage: 0.1,
      percentageNoChildren: 0.05,
    });
  });
  it('calculates impact', () => {
    expect(
      calculateImpactEstimates({
        countExclusive: 1000,
        countInclusive: 1000,
        totalSamples: 10000,
        totalSeconds: 15 * 60, // 15m
      })
    ).toEqual({
      annualizedCo2: 17.909333333333336,
      annualizedCo2NoChildren: 17.909333333333336,
      annualizedCoreSeconds: 1752000,
      annualizedCoreSecondsNoChildren: 1752000,
      annualizedDollarCost: 20.683333333333334,
      annualizedDollarCostNoChildren: 20.683333333333334,
      co2: 0.0005111111111111112,
      co2NoChildren: 0.0005111111111111112,
      coreSeconds: 50,
      coreSecondsNoChildren: 50,
      dollarCost: 0.0005902777777777778,
      dollarCostNoChildren: 0.0005902777777777778,
      percentage: 0.1,
      percentageNoChildren: 0.1,
    });
  });
});
