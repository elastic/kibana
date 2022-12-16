/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateFailedTransactionRateFromServiceMetrics } from './transaction_error_rate';

describe('calculateFailedTransactionRateFromServiceMetrics', () => {
  it('should return 0 when all params are null', () => {
    expect(
      calculateFailedTransactionRateFromServiceMetrics({
        failedTransactions: null,
        successfulTransactions: null,
      })
    ).toBe(0);
  });

  it('should return 0 when failedTransactions:null', () => {
    expect(
      calculateFailedTransactionRateFromServiceMetrics({
        failedTransactions: null,
        successfulTransactions: 2,
      })
    ).toBe(0);
  });

  it('should return 0 when failedTransactions:0', () => {
    expect(
      calculateFailedTransactionRateFromServiceMetrics({
        failedTransactions: 0,
        successfulTransactions: null,
      })
    ).toBe(0);
  });

  it('should return 1 when failedTransactions:10 and successfulTransactions:0', () => {
    expect(
      calculateFailedTransactionRateFromServiceMetrics({
        failedTransactions: 10,
        successfulTransactions: 0,
      })
    ).toBe(1);
  });
  it('should return 0,5 when failedTransactions:10 and successfulTransactions:10', () => {
    expect(
      calculateFailedTransactionRateFromServiceMetrics({
        failedTransactions: 10,
        successfulTransactions: 10,
      })
    ).toBe(0.5);
  });
});
