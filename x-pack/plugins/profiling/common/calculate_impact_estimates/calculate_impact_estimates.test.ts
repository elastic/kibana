/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { calculateImpactEstimates } from '.';

describe('calculateImpactEstimates', () => {
  it('calculates impact when countExclusive is lower than countInclusive', () => {
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 500,
      countInclusive: 1000,
      totalSamples: 10000,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      annualizedCo2: 17.909333333333336,
      annualizedCoreSeconds: 1752000,
      annualizedDollarCost: 20.683333333333334,
      co2: 0.0005111111111111112,
      coreSeconds: 50,
      dollarCost: 0.0005902777777777778,
      percentage: 0.1,
    });

    expect(selfCPU).toEqual({
      annualizedCo2: 8.954666666666668,
      annualizedCoreSeconds: 876000,
      annualizedDollarCost: 10.341666666666667,
      co2: 0.0002555555555555556,
      coreSeconds: 25,
      dollarCost: 0.0002951388888888889,
      percentage: 0.05,
    });

    expect(totalSamples).toEqual({
      percentage: 1,
      coreSeconds: 500,
      annualizedCoreSeconds: 17520000,
      co2: 0.005111111111111111,
      annualizedCo2: 179.09333333333333,
      dollarCost: 0.0059027777777777785,
      annualizedDollarCost: 206.83333333333337,
    });
  });
  it('calculates impact', () => {
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 1000,
      countInclusive: 1000,
      totalSamples: 10000,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      annualizedCo2: 17.909333333333336,
      annualizedCoreSeconds: 1752000,
      annualizedDollarCost: 20.683333333333334,
      co2: 0.0005111111111111112,
      coreSeconds: 50,
      dollarCost: 0.0005902777777777778,
      percentage: 0.1,
    });

    expect(selfCPU).toEqual({
      annualizedCo2: 17.909333333333336,
      annualizedCoreSeconds: 1752000,
      annualizedDollarCost: 20.683333333333334,
      co2: 0.0005111111111111112,
      coreSeconds: 50,
      dollarCost: 0.0005902777777777778,
      percentage: 0.1,
    });

    expect(totalSamples).toEqual({
      percentage: 1,
      coreSeconds: 500,
      annualizedCoreSeconds: 17520000,
      co2: 0.005111111111111111,
      annualizedCo2: 179.09333333333333,
      dollarCost: 0.0059027777777777785,
      annualizedDollarCost: 206.83333333333337,
    });
  });
});
