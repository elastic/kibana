/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { Histogram } from './types';

const DATA_DRIFT_CACHE: {
  loaded: boolean;
  CRITICAL_VALUES_TABLE: number[][];
  SIGNIFICANCE_LEVELS: number[];
} = {
  loaded: false,
  CRITICAL_VALUES_TABLE: [],
  SIGNIFICANCE_LEVELS: [],
};
const readFile = async (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
};

async function parseJsonFile<T>(path: string): Promise<T | undefined> {
  try {
    const file = await readFile(path);
    return JSON.parse(file);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Couldn't read json file: ${path}`);
  }
}

export const loadCriticalValuesIntoCache = async () => {
  if (!DATA_DRIFT_CACHE.loaded) {
    DATA_DRIFT_CACHE.SIGNIFICANCE_LEVELS =
      (await parseJsonFile('./critical_values/significance_levels.json')) ?? [];
    DATA_DRIFT_CACHE.CRITICAL_VALUES_TABLE =
      (await parseJsonFile('./critical_values/critical_values_table.json')) ?? [];
  }
};

const criticalTableLookup = (chi2Statistic: number, df: number) => {
  if (df < 1) return 1;
  if (!Number.isInteger(df)) throw Error('Degrees of freedom must be a valid integer');

  // Get the row index
  const rowIndex: number = df - 1;

  // Get the column index
  let minDiff: number = Math.abs(
    DATA_DRIFT_CACHE.CRITICAL_VALUES_TABLE[rowIndex][0] - chi2Statistic
  );
  let columnIndex: number = 0;
  for (let j = 1; j < DATA_DRIFT_CACHE.CRITICAL_VALUES_TABLE[rowIndex].length; j++) {
    const diff: number = Math.abs(
      DATA_DRIFT_CACHE.CRITICAL_VALUES_TABLE[rowIndex][j] - chi2Statistic
    );
    if (diff < minDiff) {
      minDiff = diff;
      columnIndex = j;
    }
  }

  const significanceLevel: number = DATA_DRIFT_CACHE.SIGNIFICANCE_LEVELS[columnIndex];
  return significanceLevel;
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
