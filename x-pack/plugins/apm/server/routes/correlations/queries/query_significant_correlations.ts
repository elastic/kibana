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
  CorrelationsParams,
} from '../../../../common/correlations/types';
import { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';

import {
  computeExpectationsAndRanges,
  splitAllSettledPromises,
} from '../utils';

import {
  fetchTransactionDurationCorrelationWithHistogram,
  fetchTransactionDurationFractions,
  fetchTransactionDurationHistogramRangeSteps,
  fetchTransactionDurationPercentiles,
  fetchTransactionDurationRanges,
} from './index';

export const fetchSignificantCorrelations = async (
  esClient: ElasticsearchClient,
  paramsWithIndex: CorrelationsParams,
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

  // We need to round the percentiles values
  // because the queries we're using based on it
  // later on wouldn't allow numbers with decimals.
  const percentiles = Object.values(percentilesRecords).map(Math.round);

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

  const { fulfilled, rejected } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldValuePairs.map((fieldValuePair) =>
        fetchTransactionDurationCorrelationWithHistogram(
          esClient,
          paramsWithIndex,
          expectations,
          ranges,
          fractions,
          histogramRangeSteps,
          totalDocCount,
          fieldValuePair
        )
      )
    )
  );

  let fallbackResult: LatencyCorrelation | undefined;
  const latencyCorrelations: LatencyCorrelation[] = [];

  fulfilled.forEach((d: LatencyCorrelation | undefined) => {
    if (d === undefined) return;
    if (Array.isArray(d.histogram)) {
      latencyCorrelations.push(d);
    } else {
      if (!fallbackResult) {
        fallbackResult = d;
      } else {
        if (
          d.ksTest > fallbackResult.ksTest &&
          d.correlation > fallbackResult.correlation
        ) {
          fallbackResult = d;
        }
      }
    }
  });

  if (latencyCorrelations.length === 0 && fallbackResult) {
    const { fieldName, fieldValue } = fallbackResult;
    const logHistogram = await fetchTransactionDurationRanges(
      esClient,
      paramsWithIndex,
      histogramRangeSteps,
      [{ fieldName, fieldValue }]
    );

    if (typeof fallbackResult === 'object' && fallbackResult !== null) {
      fallbackResult = {
        ...(fallbackResult as LatencyCorrelation),
        histogram: logHistogram,
      };
    }
  }

  const ccsWarning =
    rejected.length > 0 && paramsWithIndex?.index.includes(':');

  return {
    latencyCorrelations,
    ccsWarning,
    totalDocCount,
    fallbackResult,
  };
};
