/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import array from '@stdlib/ndarray-array';
import chi2test from '@stdlib/stats-chi2test';
import { Histogram } from './types';

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
  // Need to make sure the terms are sorted by keys so that the values match
  const allKeys: string[] = Array.from(
    new Set([
      ...normalizedBaselineTerms.map((term) => term.key.toString()),
      ...normalizedDriftedTerms.map((term) => term.key.toString()),
    ])
  ).slice(0, 100); // Only get 100 terms

  const orderedBaselineDocCount: number[] = [];
  const orderedDriftedDocCount: number[] = [];

  allKeys.forEach((key) => {
    const baselineTerm = normalizedBaselineTerms.find((term) => term.key === key);
    const driftedTerm = normalizedDriftedTerms.find((term) => term.key === key);

    orderedBaselineDocCount.push(baselineTerm?.doc_count ?? 0);
    orderedDriftedDocCount.push(driftedTerm?.doc_count ?? 0);
  });

  const table = array([
    /* A B C D */
    orderedBaselineDocCount, // expected_terms
    orderedDriftedDocCount, // observed_terms
  ]);
  const result = chi2test(table);
  return result.pValue;
};
