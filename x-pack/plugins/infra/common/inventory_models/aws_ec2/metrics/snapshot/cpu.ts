/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotModel } from '../../../types';

export const cpu: SnapshotModel = {
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
};
