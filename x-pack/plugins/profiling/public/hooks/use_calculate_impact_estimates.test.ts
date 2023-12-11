/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCalculateImpactEstimate } from './use_calculate_impact_estimates';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';

jest.mock('../components/contexts/profiling_dependencies/use_profiling_dependencies');

describe('useCalculateImpactEstimate', () => {
  beforeAll(() => {
    (useProfilingDependencies as jest.Mock).mockReturnValue({
      start: {
        core: {
          uiSettings: {
            get: (key: string) => {
              if (key === profilingPervCPUWattX86) {
                return 7;
              }
              if (key === profilingCo2PerKWH) {
                return 0.000379069;
              }
              if (key === profilingDatacenterPUE) {
                return 1.7;
              }
            },
          },
        },
      },
    });
  });

  it('calculates impact when countExclusive is lower than countInclusive', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 500,
      countInclusive: 1000,
      totalSamples: 10000,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      percentage: 0.1,
      coreSeconds: 50,
      annualizedCoreSeconds: 1752000,
      co2: 0.00006265168194444443,
      annualizedCo2: 2.1953149353333328,
      dollarCost: 0.0005902777777777778,
      annualizedDollarCost: 20.683333333333334,
    });

    expect(selfCPU).toEqual({
      percentage: 0.05,
      coreSeconds: 25,
      annualizedCoreSeconds: 876000,
      co2: 0.000031325840972222215,
      annualizedCo2: 1.0976574676666664,
      dollarCost: 0.0002951388888888889,
      annualizedDollarCost: 10.341666666666667,
    });

    expect(totalSamples).toEqual({
      percentage: 1,
      coreSeconds: 500,
      annualizedCoreSeconds: 17520000,
      co2: 0.0006265168194444444,
      annualizedCo2: 21.95314935333333,
      dollarCost: 0.0059027777777777785,
      annualizedDollarCost: 206.83333333333337,
    });
  });

  it('calculates impact', () => {
    const calculateImpactEstimates = useCalculateImpactEstimate();
    const { selfCPU, totalCPU, totalSamples } = calculateImpactEstimates({
      countExclusive: 1000,
      countInclusive: 1000,
      totalSamples: 10000,
      totalSeconds: 15 * 60, // 15m
    });

    expect(totalCPU).toEqual({
      percentage: 0.1,
      coreSeconds: 50,
      annualizedCoreSeconds: 1752000,
      co2: 0.00006265168194444443,
      annualizedCo2: 2.1953149353333328,
      dollarCost: 0.0005902777777777778,
      annualizedDollarCost: 20.683333333333334,
    });

    expect(selfCPU).toEqual({
      percentage: 0.1,
      coreSeconds: 50,
      annualizedCoreSeconds: 1752000,
      co2: 0.00006265168194444443,
      annualizedCo2: 2.1953149353333328,
      dollarCost: 0.0005902777777777778,
      annualizedDollarCost: 20.683333333333334,
    });

    expect(totalSamples).toEqual({
      percentage: 1,
      coreSeconds: 500,
      annualizedCoreSeconds: 17520000,
      co2: 0.0006265168194444444,
      annualizedCo2: 21.95314935333333,
      dollarCost: 0.0059027777777777785,
      annualizedDollarCost: 206.83333333333337,
    });
  });
});
