/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import type { Distribution } from '../../../../common/types/field_stats';

export const processDistributionData = (
  percentiles: Array<{ value: number }>,
  percentileSpacing: number,
  minValue: number
): Distribution => {
  const distribution: Distribution = { percentiles: [], minPercentile: 0, maxPercentile: 100 };
  if (percentiles.length === 0) {
    return distribution;
  }

  let percentileBuckets: Array<{ value: number }> = [];
  let lowerBound = minValue;
  if (lowerBound >= 0) {
    // By default return results for 0 - 90% percentiles.
    distribution.minPercentile = 0;
    distribution.maxPercentile = 90;
    percentileBuckets = percentiles.slice(0, percentiles.length - 2);

    // Look ahead to the last percentiles and process these too if
    // they don't add more than 50% to the value range.
    const lastValue = (last(percentileBuckets) as any).value;
    const upperBound = lowerBound + 1.5 * (lastValue - lowerBound);
    const filteredLength = percentileBuckets.length;
    for (let i = filteredLength; i < percentiles.length; i++) {
      if (percentiles[i].value < upperBound) {
        percentileBuckets.push(percentiles[i]);
        distribution.maxPercentile += percentileSpacing;
      } else {
        break;
      }
    }
  } else {
    // By default return results for 5 - 95% percentiles.
    const dataMin = lowerBound;
    lowerBound = percentiles[0].value;
    distribution.minPercentile = 5;
    distribution.maxPercentile = 95;
    percentileBuckets = percentiles.slice(1, percentiles.length - 1);

    // Add in 0-5 and 95-100% if they don't add more
    // than 25% to the value range at either end.
    const lastValue: number = (last(percentileBuckets) as { value: number }).value;
    const maxDiff = 0.25 * (lastValue - lowerBound);
    if (lowerBound - dataMin < maxDiff) {
      percentileBuckets.splice(0, 0, percentiles[0]);
      distribution.minPercentile = 0;
      lowerBound = dataMin;
    }

    if (percentiles[percentiles.length - 1].value - lastValue < maxDiff) {
      percentileBuckets.push(percentiles[percentiles.length - 1]);
      distribution.maxPercentile = 100;
    }
  }

  // Combine buckets with the same value.
  const totalBuckets = percentileBuckets.length;
  let lastBucketValue = lowerBound;
  let numEqualValueBuckets = 0;
  for (let i = 0; i < totalBuckets; i++) {
    const bucket = percentileBuckets[i];

    // Results from the percentiles aggregation can have precision rounding
    // artifacts e.g returning 200 and 200.000000000123, so check for equality
    // around double floating point precision i.e. 15 sig figs.
    if (bucket.value.toPrecision(15) !== lastBucketValue.toPrecision(15)) {
      // Create a bucket for any 'equal value' buckets which had a value <= last bucket
      if (numEqualValueBuckets > 0) {
        distribution.percentiles.push({
          percent: numEqualValueBuckets * percentileSpacing,
          minValue: lastBucketValue,
          maxValue: lastBucketValue,
        });
      }

      distribution.percentiles.push({
        percent: percentileSpacing,
        minValue: lastBucketValue,
        maxValue: bucket.value,
      });

      lastBucketValue = bucket.value;
      numEqualValueBuckets = 0;
    } else {
      numEqualValueBuckets++;
      if (i === totalBuckets - 1) {
        // If at the last bucket, create a final bucket for the equal value buckets.
        distribution.percentiles.push({
          percent: numEqualValueBuckets * percentileSpacing,
          minValue: lastBucketValue,
          maxValue: lastBucketValue,
        });
      }
    }
  }

  return distribution;
};
