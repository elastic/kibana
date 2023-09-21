/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

// The cost of an x86 CPU core per hour, in US$.
// (ARM is 60% less based graviton 3 data, see https://aws.amazon.com/ec2/graviton/)
const CORE_COST_PER_HOUR = 0.0425;

export function calculateImpactEstimates({
  countInclusive,
  countExclusive,
  totalSamples,
  totalSeconds,
  perCoreWatts,
  co2PerTonKWH,
  datacenterPUE,
}: {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
  perCoreWatts: number;
  co2PerTonKWH: number;
  datacenterPUE: number;
}) {
  return {
    totalSamples: calculateImpact({
      samples: totalSamples,
      totalSamples,
      totalSeconds,
      perCoreWatts,
      co2PerTonKWH,
      datacenterPUE,
    }),
    totalCPU: calculateImpact({
      samples: countInclusive,
      totalSamples,
      totalSeconds,
      perCoreWatts,
      co2PerTonKWH,
      datacenterPUE,
    }),
    selfCPU: calculateImpact({
      samples: countExclusive,
      totalSamples,
      totalSeconds,
      perCoreWatts,
      co2PerTonKWH,
      datacenterPUE,
    }),
  };
}

function calculateImpact({
  samples,
  totalSamples,
  totalSeconds,
  perCoreWatts,
  co2PerTonKWH,
  datacenterPUE,
}: {
  samples: number;
  totalSamples: number;
  totalSeconds: number;
  perCoreWatts: number;
  co2PerTonKWH: number;
  datacenterPUE: number;
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
