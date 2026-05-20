/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFiniteNumber } from './is_finite_number';

interface DocumentWithTransactionDuration {
  transaction?: { duration?: { us?: number } };
}

interface DocumentWithSpanDuration {
  span?: { duration?: { us?: number } };
}

/**
 * Safely extracts `transaction.duration.us` from an APM document,
 * returning 0 when the field is missing or not a valid number.
 */
export const getTransactionDurationUs = (document?: DocumentWithTransactionDuration): number => {
  const value = Number(document?.transaction?.duration?.us);
  return isFiniteNumber(value) ? value : 0;
};

/**
 * Safely extracts `span.duration.us` from an APM document,
 * returning 0 when the field is missing or not a valid number.
 */
export const getSpanDurationUs = (document?: DocumentWithSpanDuration): number => {
  const value = Number(document?.span?.duration?.us);
  return isFiniteNumber(value) ? value : 0;
};
