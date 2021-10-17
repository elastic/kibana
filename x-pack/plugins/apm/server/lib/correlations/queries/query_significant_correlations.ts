/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';

import type { ElasticsearchClient } from 'src/core/server';

import type {
  FieldValuePair,
  SearchStrategyParams,
} from '../../../../common/correlations/types';
import {
  isLatencyCorrelation,
  LatencyCorrelation,
} from '../../../../common/correlations/latency_correlations/types';

import {
  fetchTransactionDurationFractions,
  fetchTransactionDurationHistogramRangeSteps,
  fetchTransactionDurationHistograms,
  fetchTransactionDurationPercentiles,
} from './index';
import { computeExpectationsAndRanges } from '../utils';

export const fetchSignificantCorrelations = async (
  esClient: ElasticsearchClient,
  paramsWithIndex: SearchStrategyParams,
  fieldValuePairs: FieldValuePair[]
) => {
  // Create an array of ranges [2, 4, 6, ..., 98]
  const percentileAggregationPercents = range(2, 100, 2);
  const { percentiles: percentilesRecords } =
    await fetchTransactionDurationPercentiles(
      esClient,
      paramsWithIndex,
      percentileAggregationPercents
    );
  const percentiles = Object.values(percentilesRecords);

  const { expectations, ranges } = computeExpectationsAndRanges(percentiles);

  const { fractions, totalDocCount } = await fetchTransactionDurationFractions(
    esClient,
    paramsWithIndex,
    ranges
  );

  const histogramRangeSteps = await fetchTransactionDurationHistogramRangeSteps(
    esClient,
    paramsWithIndex
  );

  const latencyCorrelations: LatencyCorrelation[] = [];
  let ccsWarning = false;

  for await (const item of fetchTransactionDurationHistograms(
    esClient,
    paramsWithIndex,
    expectations,
    ranges,
    fractions,
    histogramRangeSteps,
    totalDocCount,
    fieldValuePairs
  )) {
    if (isLatencyCorrelation(item)) {
      latencyCorrelations.push(item);
    } else if (
      typeof item === 'object' &&
      item !== null &&
      {}.hasOwnProperty.call(item, 'error') &&
      paramsWithIndex?.index.includes(':')
    ) {
      ccsWarning = true;
    }
  }

  return { latencyCorrelations, ccsWarning, totalDocCount };
};
