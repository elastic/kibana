/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPerCoreWatt,
} from '@kbn/observability-plugin/common';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { calculateImpactEstimates } from '../../common/calculate_impact_estimates';

interface Params {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
}

export type CalculateImpactEstimates = ReturnType<typeof useCalculateImpactEstimate>;
export type ImpactEstimates = ReturnType<CalculateImpactEstimates>;

export function useCalculateImpactEstimate() {
  const {
    start: { core },
  } = useProfilingDependencies();

  const perCoreWatts = core.uiSettings.get<number>(profilingPerCoreWatt);
  const co2PerTonKWH = core.uiSettings.get<number>(profilingCo2PerKWH);
  const datacenterPUE = core.uiSettings.get<number>(profilingDatacenterPUE);

  function calculateImpactEstimatesWithSettings(params: Params) {
    return calculateImpactEstimates({
      ...params,
      co2PerTonKWH,
      datacenterPUE,
      perCoreWatts,
    });
  }

  return calculateImpactEstimatesWithSettings;
}
