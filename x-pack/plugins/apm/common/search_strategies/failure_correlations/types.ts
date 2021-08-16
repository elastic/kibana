/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FAILURE_CORRELATION_IMPACT_THRESHOLD } from './constants';

export interface FailedTransactionsCorrelationValue {
  key: string;
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
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

export type FailureCorrelationImpactThreshold = typeof FAILURE_CORRELATION_IMPACT_THRESHOLD[keyof typeof FAILURE_CORRELATION_IMPACT_THRESHOLD];
