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

export type FailedTransactionsCorrelationsImpactThreshold = typeof FAILED_TRANSACTIONS_IMPACT_THRESHOLD[keyof typeof FAILED_TRANSACTIONS_IMPACT_THRESHOLD];

export type FailedTransactionsCorrelationsParams = SearchStrategyClientParams;

export interface FailedTransactionsCorrelationsRawResponse
  extends RawResponseBase {
  log: string[];
  failedTransactionsCorrelations: FailedTransactionsCorrelation[];
}
