/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistogramItem } from '../query_ranges';
import { roundToDecimalPlace } from '../../../../../common/search_strategies/correlations/formatting_utils';

export function* range(start: number, end: number, step: number) {
  while (start < end) {
    yield start;
    start += step;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}

// Roughly compare histograms by sampling random bins
// And rounding up histogram count to account for different floating points
export const isHistogramRoughlyEqual = (
  a: HistogramItem[],
  b: HistogramItem[],
  { numBinsToSample = 10, significantFraction = 3 }
) => {
  if (a.length !== b.length) return false;

  const sampledIndices = Array.from(Array(numBinsToSample).keys()).map(() =>
    getRandomInt(0, a.length - 1)
  );
  return !sampledIndices.some((idx) => {
    return (
      roundToDecimalPlace(a[idx].key, significantFraction) !==
        roundToDecimalPlace(b[idx].key, significantFraction) &&
      roundToDecimalPlace(a[idx].doc_count, significantFraction) !==
        roundToDecimalPlace(b[idx].doc_count, significantFraction)
    );
  });
};
