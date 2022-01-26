/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators } from '../../../../../common/alerting/metrics';

export const createPercentileAggregation = (
  type: Aggregators.P95 | Aggregators.P99,
  field: string
) => {
  const value = type === Aggregators.P95 ? 95 : 99;
  return {
    aggregatedValue: {
      percentiles: {
        field,
        percents: [value],
        keyed: false,
      },
    },
  };
};
