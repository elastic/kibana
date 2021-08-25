/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FAILED_TRANSACTIONS_IMPACT_THRESHOLD } from './constants';

export interface FailedTransactionsCorrelationValue {
  key: string;
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  fieldName: string;
  fieldValue: string;
  normalizedScore: number;
  failurePercentage: number;
  successPercentage: number;
}

export type FailureCorrelationImpactThreshold = typeof FAILED_TRANSACTIONS_IMPACT_THRESHOLD[keyof typeof FAILED_TRANSACTIONS_IMPACT_THRESHOLD];

export interface CorrelationsTerm {
  fieldName: string;
  fieldValue: string;
}
