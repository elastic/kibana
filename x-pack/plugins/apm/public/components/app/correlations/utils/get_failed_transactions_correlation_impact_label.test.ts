/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFailedTransactionsCorrelationImpactLabel } from './get_failed_transactions_correlation_impact_label';
import { FAILED_TRANSACTIONS_IMPACT_THRESHOLD } from '../../../../../common/search_strategies/failure_correlations/constants';

describe('getFailedTransactionsCorrelationImpactLabel', () => {
  it('returns null if value is invalid ', () => {
    expect(getFailedTransactionsCorrelationImpactLabel(-0.03)).toBe(null);
    expect(getFailedTransactionsCorrelationImpactLabel(NaN)).toBe(null);
    expect(getFailedTransactionsCorrelationImpactLabel(Infinity)).toBe(null);
  });

  it('returns null if value is greater than or equal to the threshold ', () => {
    expect(getFailedTransactionsCorrelationImpactLabel(0.02)).toBe(null);
    expect(getFailedTransactionsCorrelationImpactLabel(0.1)).toBe(null);
  });

  it('returns High if value is within [0, 1e-6) ', () => {
    expect(getFailedTransactionsCorrelationImpactLabel(0)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.HIGH
    );
    expect(getFailedTransactionsCorrelationImpactLabel(1e-7)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.HIGH
    );
  });

  it('returns Medium if value is within [1e-6, 1e-3) ', () => {
    expect(getFailedTransactionsCorrelationImpactLabel(1e-6)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.MEDIUM
    );
    expect(getFailedTransactionsCorrelationImpactLabel(1e-5)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.MEDIUM
    );
    expect(getFailedTransactionsCorrelationImpactLabel(1e-4)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.MEDIUM
    );
  });

  it('returns Low if value is within [1e-3, 0.02) ', () => {
    expect(getFailedTransactionsCorrelationImpactLabel(1e-3)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.LOW
    );
    expect(getFailedTransactionsCorrelationImpactLabel(0.009)).toBe(
      FAILED_TRANSACTIONS_IMPACT_THRESHOLD.LOW
    );
  });
});
