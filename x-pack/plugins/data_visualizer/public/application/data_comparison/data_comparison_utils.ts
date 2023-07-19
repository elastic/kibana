/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Histogram } from './types';

const criticalTableLookup = (chi2Statistic: number, df: number) => {
  if (df < 1) return 1;
};

/**
 * Compute the p-value for how similar the datasets are.
 * Returned value ranges from 0 to 1, with 1 meaning the datasets are identical.
 * @param normalizedBaselineTerms
 * @param normalizedDriftedTerms
 */
export const computeChi2PValue = (
  normalizedBaselineTerms: Histogram[],
  normalizedDriftedTerms: Histogram[]
) => {
  // Get all unique keys from both arrays
  const allKeys: string[] = Array.from(
    new Set([
      ...normalizedBaselineTerms.map((term) => term.key.toString()),
      ...normalizedDriftedTerms.map((term) => term.key.toString()),
    ])
  ).slice(0, 100);

  // Calculate the chi-squared statistic and degrees of freedom
  let chiSquared: number = 0;
  const degreesOfFreedom: number = allKeys.length - 1;

  if (degreesOfFreedom === 0) return 1;

  allKeys.forEach((key) => {
    const baselineTerm = normalizedBaselineTerms.find((term) => term.key === key);
    const driftedTerm = normalizedDriftedTerms.find((term) => term.key === key);

    const observed: number = driftedTerm?.percentage ?? 0;
    const expected: number = baselineTerm?.percentage ?? 0;
    chiSquared += Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero
  });

  return criticalTableLookup(chiSquared, degreesOfFreedom);
};
