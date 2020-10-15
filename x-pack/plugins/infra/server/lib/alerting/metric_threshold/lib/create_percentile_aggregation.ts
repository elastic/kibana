/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregators } from '../types';
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
