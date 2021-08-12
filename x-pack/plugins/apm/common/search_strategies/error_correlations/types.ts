/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FAILED_TRANSACTION_CORRELATION_IMPACT } from './constants';

export interface ErrorCorrelationValue {
  key: string;
  doc_count: number;
  bg_count: number;
  score: number;
  p_value: number | null;
  fieldName: string;
  fieldValue: string;
}

export interface BaseSearchStrategyResponse {
  took: number;
  log: string[];
  ccsWarning: boolean;
  error?: Error;
  isComplete: boolean;
  isRunning: boolean;
  progress: number;
  timeTook: number;
  startFetch: () => void;
  cancelFetch: () => void;
}

export type FailedTransactionCorrelationImpact = typeof FAILED_TRANSACTION_CORRELATION_IMPACT[keyof typeof FAILED_TRANSACTION_CORRELATION_IMPACT]; // typeof JOB_FIELD_TYPES[keyof typeof JOB_FIELD_TYPES];
