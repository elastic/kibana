/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';

import type { SearchStrategyParams } from '../../../../common/correlations/types';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';

import { ERROR_CORRELATION_THRESHOLD } from '../constants';

import {
  fetchFailedTransactionsCorrelationPValues,
  fetchTransactionDurationHistogramRangeSteps,
} from './index';

export const fetchPValues = async (
  esClient: ElasticsearchClient,
  paramsWithIndex: SearchStrategyParams,
  fieldCandidates: string[]
) => {
  const failedTransactionsCorrelations: FailedTransactionsCorrelation[] = [];

  const histogramRangeSteps = await fetchTransactionDurationHistogramRangeSteps(
    esClient,
    paramsWithIndex
  );

  const results = await Promise.allSettled(
    fieldCandidates.map((fieldName) =>
      fetchFailedTransactionsCorrelationPValues(
        esClient,
        paramsWithIndex,
        histogramRangeSteps,
        fieldName
      )
    )
  );

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      failedTransactionsCorrelations.push(
        ...result.value.filter(
          (record) =>
            record &&
            typeof record.pValue === 'number' &&
            record.pValue < ERROR_CORRELATION_THRESHOLD
        )
      );
    } else {
      // If one of the fields in the batch had an error
      // addLogMessage(
      //   `Error getting error correlation for field ${fieldCandidates[idx]}: ${result.reason}.`
      // );
    }
  });

  // TODO Fix CCS warning
  return { failedTransactionsCorrelations, ccsWarning: false };
};
