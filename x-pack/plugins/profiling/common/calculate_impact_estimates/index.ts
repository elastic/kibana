/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

// The assumed amortized per-core average power consumption (based on 100% CPU Utilization).
// Reference: https://www.cloudcarbonfootprint.org/docs/methodology/#appendix-i-energy-coefficients
const PER_CORE_WATT = 7;

// The assumed CO2 emissions in kg per kWh (the reference uses metric tons/kWh).
// This value represents "regional carbon intensity" and it defaults to AWS us-east-1.
// Reference: https://www.cloudcarbonfootprint.org/docs/methodology/#appendix-v-grid-emissions-factors
const CO2_PER_KWH = 0.379069;

// The assumed PUE of the datacenter (1.7 is likely to be an on-prem value).
const DATACENTER_PUE = 1.7;

// The cost of an x86 CPU core per hour, in US$.
// (ARM is 60% less based graviton 3 data, see https://aws.amazon.com/ec2/graviton/)
const CORE_COST_PER_HOUR = 0.0425;

export function calculateImpactEstimates({
  countInclusive,
  countExclusive,
  totalSamples,
  totalSeconds,
}: {
  countInclusive: number;
  countExclusive: number;
  totalSamples: number;
  totalSeconds: number;
}) {
  return {
    totalSamples: calculateImpact({
      samples: totalSamples,
      totalSamples,
      totalSeconds,
    }),
    totalCPU: calculateImpact({
      samples: countInclusive,
      totalSamples,
      totalSeconds,
    }),
    selfCPU: calculateImpact({
      samples: countExclusive,
      totalSamples,
      totalSeconds,
    }),
  };
}

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
  const co2 = ((PER_CORE_WATT * coreHours) / 1000.0) * CO2_PER_KWH * DATACENTER_PUE;
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
