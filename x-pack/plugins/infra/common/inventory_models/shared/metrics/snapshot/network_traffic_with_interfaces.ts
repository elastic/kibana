/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotModel } from '../../../types';

export const networkTrafficWithInterfaces = (
  id: string,
  metricField: string,
  interfaceField: string
): SnapshotModel => ({
  [`${id}_interfaces`]: {
    terms: { field: interfaceField },
    aggregations: {
      [`${id}_interface_max`]: { max: { field: metricField } },
    },
  },
  [`${id}_sum_of_interfaces`]: {
    sum_bucket: {
      buckets_path: `${id}_interfaces>${id}_interface_max`,
    },
  },
  [`${id}_deriv`]: {
    derivative: {
      buckets_path: `${id}_sum_of_interfaces`,
      gap_policy: 'skip',
      unit: '1s',
    },
  },
  [id]: {
    bucket_script: {
      buckets_path: { value: `${id}_deriv[normalized_value]` },
      script: {
        source: 'params.value > 0.0 ? params.value : 0.0',
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
});
