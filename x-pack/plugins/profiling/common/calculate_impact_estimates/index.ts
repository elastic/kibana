/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ANNUAL_SECONDS = 60 * 60 * 24 * 365;

// The assumed amortized per-core average power consumption.
const PER_CORE_WATT = 40;

// The assumed CO2 emissions per KWH (sourced from www.eia.gov)
const CO2_PER_KWH = 0.92;

// The cost of a CPU core per hour, in dollars
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
  const annualizedScaleUp = ANNUAL_SECONDS / totalSeconds;

  const percentage = countInclusive / totalSamples;
  const percentageNoChildren = countExclusive / totalSamples;
  const totalCoreSeconds = totalSamples / 20;
  const coreSeconds = totalCoreSeconds * percentage;
  const annualizedCoreSeconds = coreSeconds * annualizedScaleUp;
  const coreSecondsNoChildren = totalCoreSeconds * percentageNoChildren;
  const annualizedCoreSecondsNoChildren = coreSecondsNoChildren * annualizedScaleUp;
  const coreHours = coreSeconds / (60 * 60);
  const coreHoursNoChildren = coreSecondsNoChildren / (60 * 60);
  const co2 = ((PER_CORE_WATT * coreHours) / 1000.0) * CO2_PER_KWH;
  const co2NoChildren = ((PER_CORE_WATT * coreHoursNoChildren) / 1000.0) * CO2_PER_KWH;
  const annualizedCo2 = co2 * annualizedScaleUp;
  const annualizedCo2NoChildren = co2NoChildren * annualizedScaleUp;
  const dollarCost = coreHours * CORE_COST_PER_HOUR;
  const annualizedDollarCost = dollarCost * annualizedScaleUp;
  const dollarCostNoChildren = coreHoursNoChildren * CORE_COST_PER_HOUR;
  const annualizedDollarCostNoChildren = dollarCostNoChildren * annualizedScaleUp;

  return {
    percentage,
    percentageNoChildren,
    coreSeconds,
    annualizedCoreSeconds,
    coreSecondsNoChildren,
    annualizedCoreSecondsNoChildren,
    co2,
    co2NoChildren,
    annualizedCo2,
    annualizedCo2NoChildren,
    dollarCost,
    annualizedDollarCost,
    dollarCostNoChildren,
    annualizedDollarCostNoChildren,
  };
}
