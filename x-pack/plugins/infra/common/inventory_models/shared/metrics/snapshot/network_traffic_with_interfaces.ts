/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';

export const networkTrafficWithInterfaces = (
  id: string,
  metricField: string,
  interfaceField: string
): MetricsUIAggregation => ({
  [`${id}_interfaces`]: {
    terms: { field: interfaceField },
    aggregations: {
      [`${id}_interface_max`]: { max: { field: metricField } },
    },
  },
  [id]: {
    sum_bucket: {
      buckets_path: `${id}_interfaces>${id}_interface_max`,
    },
  },
});
