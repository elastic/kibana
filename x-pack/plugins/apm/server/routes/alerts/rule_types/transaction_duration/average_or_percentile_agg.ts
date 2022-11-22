/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationType } from '../../../../../common/rules/apm_rule_types';
import { getDurationFieldForTransactions } from '../../../../lib/helpers/transactions';

type TransactionDurationField = ReturnType<
  typeof getDurationFieldForTransactions
>;

/* eslint @typescript-eslint/consistent-type-definitions: ["error", "type"] */
type AvgLatencyAgg = {
  avgLatency: { avg: { field: TransactionDurationField } };
};
type PctLatencyAgg = {
  pctLatency: {
    percentiles: {
      field: TransactionDurationField;
      percents: [95] | [99];
      keyed: false;
    };
  };
};

export function averageOrPercentileAgg({
  aggregationType,
  transactionDurationField,
}: {
  aggregationType: AggregationType;
  transactionDurationField: TransactionDurationField;
}): AvgLatencyAgg | PctLatencyAgg {
  if (aggregationType === AggregationType.Avg) {
    return { avgLatency: { avg: { field: transactionDurationField } } };
  }
  return {
    pctLatency: {
      percentiles: {
        field: transactionDurationField,
        percents: [aggregationType === AggregationType.P95 ? 95 : 99],
        keyed: false as const,
      },
    },
  };
}

export function getMultiTermsSortOrder(aggregationType: AggregationType): {
  order: { [path: string]: 'desc' };
} {
  if (aggregationType === AggregationType.Avg) {
    return { order: { avgLatency: 'desc' } };
  }
  const percentsKey = aggregationType === AggregationType.P95 ? 95 : 99;
  return { order: { [`pctLatency.${percentsKey}`]: 'desc' } };
}
