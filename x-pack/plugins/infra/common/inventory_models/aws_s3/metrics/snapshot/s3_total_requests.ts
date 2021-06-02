/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from '../../../shared/lib/transformers/noop';
import { MetricsUISnapshotMetric } from '../../../types';

export const s3TotalRequests: MetricsUISnapshotMetric = {
  aggs: {
    s3TotalRequests: {
      max: {
        field: 'aws.s3_request.requests.total',
      },
    },
  },
  transformer: noop,
};
