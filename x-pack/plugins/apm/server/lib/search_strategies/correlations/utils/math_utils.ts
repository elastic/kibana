/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import { HistogramItem } from '../query_ranges';
import { asPreciseDecimal } from '../../../../../common/utils/formatters';

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
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
      asPreciseDecimal(a[idx].key, significantFraction) !==
        asPreciseDecimal(b[idx].key, significantFraction) &&
      roundToNearest(a[idx].doc_count) !== roundToNearest(b[idx].doc_count)
    );
  });
};

/** Round numeric to the nearest 5
 * E.g. if roundBy = 5, results will be 11 -> 10, 14 -> 10, 16 -> 20
 */
export const roundToNearest = (n: number, roundBy = 5) => {
  return Math.ceil((n + 1) / roundBy) * roundBy;
};

/**
 * Create a rough stringified version of the histogram
 */
export const hashHistogram = (
  histogram: HistogramItem[],
  { significantFraction = 3, numBinsToSample = 10 }
) => {
  // Generate bins to sample evenly
  const sampledIndices = Array.from(
    range(
      0,
      histogram.length - 1,
      Math.ceil(histogram.length / numBinsToSample)
    )
  );
  return JSON.stringify(
    sampledIndices.map((idx) => {
      return `${asPreciseDecimal(
        histogram[idx].key,
        significantFraction
      )}-${roundToNearest(histogram[idx].doc_count)}`;
    })
  );
};
