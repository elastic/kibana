/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';

import type { CorrelationsParams } from '../../../../common/correlations/types';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import { ERROR_CORRELATION_THRESHOLD } from '../../../../common/correlations/constants';

import { splitAllSettledPromises } from '../utils';

import {
  fetchFailedTransactionsCorrelationPValues,
  fetchTransactionDurationHistogramRangeSteps,
} from './index';

export const fetchPValues = async (
  esClient: ElasticsearchClient,
  paramsWithIndex: CorrelationsParams,
  fieldCandidates: string[]
) => {
  const histogramRangeSteps = await fetchTransactionDurationHistogramRangeSteps(
    esClient,
    paramsWithIndex
  );

  const { fulfilled, rejected } = splitAllSettledPromises(
    await Promise.allSettled(
      fieldCandidates.map((fieldName) =>
        fetchFailedTransactionsCorrelationPValues(
          esClient,
          paramsWithIndex,
          histogramRangeSteps,
          fieldName
        )
      )
    )
  );

  const failedTransactionsCorrelations: FailedTransactionsCorrelation[] =
    fulfilled
      .flat()
      .filter(
        (record) =>
          record &&
          typeof record.pValue === 'number' &&
          record.pValue < ERROR_CORRELATION_THRESHOLD
      );

  const ccsWarning =
    rejected.length > 0 && paramsWithIndex?.index.includes(':');

  return { failedTransactionsCorrelations, ccsWarning };
};
