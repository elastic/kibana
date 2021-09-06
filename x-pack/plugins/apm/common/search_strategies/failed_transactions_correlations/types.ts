/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldValuePair,
  RawResponseBase,
  SearchStrategyClientParams,
} from '../types';

import { FAILED_TRANSACTIONS_IMPACT_THRESHOLD } from './constants';

export interface FailedTransactionsCorrelation extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
  failurePercentage: number;
  successPercentage: number;
}

// Type guard for populated array of FailedTransactionsCorrelation
export const isFailedTransactionsCorrelations = (
  arg: unknown
): arg is FailedTransactionsCorrelation[] => {
  return (
    Array.isArray(arg) &&
    arg.length > 0 &&
    arg.every(
      (d) =>
        typeof d === 'object' &&
        d !== null &&
        Object.keys(d).length === 9 &&
        typeof d.doc_count === 'number' &&
        typeof d.bg_count === 'number' &&
        typeof d.score === 'number' &&
        (typeof d.pValue === 'number' || d.pValue === null) &&
        typeof d.fieldName === 'string' &&
        (typeof d.fieldValue === 'string' ||
          typeof d.fieldValue === 'number') &&
        typeof d.normalizedScore === 'number' &&
        typeof d.failurePercentage === 'number' &&
        typeof d.successPercentage === 'number'
    )
  );
};

export type FailedTransactionsCorrelationsImpactThreshold = typeof FAILED_TRANSACTIONS_IMPACT_THRESHOLD[keyof typeof FAILED_TRANSACTIONS_IMPACT_THRESHOLD];

export type FailedTransactionsCorrelationsParams = SearchStrategyClientParams;

export interface FailedTransactionsCorrelationsRawResponse
  extends RawResponseBase {
  log: string[];
  failedTransactionsCorrelations: FailedTransactionsCorrelation[];
}
