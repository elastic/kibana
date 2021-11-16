/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { PERCENTILES_STEP } from '../../../../common/correlations/constants';

export const computeExpectationsAndRanges = (
  percentiles: number[],
  step = PERCENTILES_STEP
): {
  expectations: number[];
  ranges: estypes.AggregationsAggregationRange[];
} => {
  const tempPercentiles = [percentiles[0]];
  const tempFractions = [step / 100];
  // Collapse duplicates
  for (let i = 1; i < percentiles.length; i++) {
    if (percentiles[i] !== percentiles[i - 1]) {
      tempPercentiles.push(percentiles[i]);
      tempFractions.push(PERCENTILES_STEP / 100);
    } else {
      tempFractions[tempFractions.length - 1] =
        tempFractions[tempFractions.length - 1] + step / 100;
    }
  }
  tempFractions.push(PERCENTILES_STEP / 100);

  const ranges = tempPercentiles
    .map((tP) => Math.round(tP))
    .reduce((p, to) => {
      const from = p[p.length - 1]?.to;
      if (from !== undefined) {
        p.push({ from, to });
      } else {
        p.push({ to });
      }
      return p;
    }, [] as Array<{ from?: number; to?: number }>);
  if (ranges.length > 0) {
    ranges.push({ from: ranges[ranges.length - 1].to });
  }

  const expectations = [tempPercentiles[0]];
  for (let i = 1; i < tempPercentiles.length; i++) {
    expectations.push(
      (tempFractions[i - 1] * tempPercentiles[i - 1] +
        tempFractions[i] * tempPercentiles[i]) /
        (tempFractions[i - 1] + tempFractions[i])
    );
  }
  expectations.push(tempPercentiles[tempPercentiles.length - 1]);
  return { expectations, ranges };
};
