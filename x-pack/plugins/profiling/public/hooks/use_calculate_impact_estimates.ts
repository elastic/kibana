/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

interface Params {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
}

export type CalculateImpactEstimates = ReturnType<typeof useCalculateImpactEstimate>;
export type ImpactEstimates = ReturnType<CalculateImpactEstimates>;

export const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

// The cost of an x86 CPU core per hour, in US$.
// (ARM is 60% less based graviton 3 data, see https://aws.amazon.com/ec2/graviton/)
const CORE_COST_PER_HOUR = 0.0425;

export function useCalculateImpactEstimate() {
  const {
    start: { core },
  } = useProfilingDependencies();

  const perCoreWatts = core.uiSettings.get<number>(profilingPervCPUWattX86);
  const co2PerTonKWH = core.uiSettings.get<number>(profilingCo2PerKWH);
  const datacenterPUE = core.uiSettings.get<number>(profilingDatacenterPUE);

  function calculateImpact({
    samples,
    totalSamples,
    totalSeconds,
  }: {
    samples: number;
    totalSamples: number;
    totalSeconds: number;
  }) {
    const annualizedScaleUp = ANNUAL_SECONDS / totalSeconds;
    const totalCoreSeconds = totalSamples / 20;
    const percentage = samples / totalSamples;
    const coreSeconds = totalCoreSeconds * percentage;
    const annualizedCoreSeconds = coreSeconds * annualizedScaleUp;
    const coreHours = coreSeconds / (60 * 60);
    const co2PerKWH = co2PerTonKWH * 1000;
    const co2 = ((perCoreWatts * coreHours) / 1000.0) * co2PerKWH * datacenterPUE;
    const annualizedCo2 = co2 * annualizedScaleUp;
    const dollarCost = coreHours * CORE_COST_PER_HOUR;
    const annualizedDollarCost = dollarCost * annualizedScaleUp;

    return {
      percentage,
      coreSeconds,
      annualizedCoreSeconds,
      co2,
      annualizedCo2,
      dollarCost,
      annualizedDollarCost,
    };
  }

  return (params: Params) => {
    return {
      totalSamples: calculateImpact({
        samples: params.totalSamples,
        totalSamples: params.totalSamples,
        totalSeconds: params.totalSeconds,
      }),
      totalCPU: calculateImpact({
        samples: params.countInclusive,
        totalSamples: params.totalSamples,
        totalSeconds: params.totalSeconds,
      }),
      selfCPU: calculateImpact({
        samples: params.countExclusive,
        totalSamples: params.totalSamples,
        totalSeconds: params.totalSeconds,
      }),
    };
  };
}
