/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUISnapshotMetric } from '../../../types';
import { noop } from '../../../shared/lib/transformers/noop';

export const cpu: MetricsUISnapshotMetric = {
  aggs: {
    cpu_avg: {
      avg: {
        field: 'aws.ec2.cpu.total.pct',
      },
    },
    cpu: {
      bucket_script: {
        buckets_path: {
          cpu: 'cpu_avg',
        },
        script: {
          source: 'params.cpu / 100',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
  transformer: noop,
};
