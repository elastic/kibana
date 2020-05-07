/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotModel } from '../../../types';

export const count: SnapshotModel = {
  count: {
    bucket_script: {
      buckets_path: { count: '_count' },
      script: {
        source: 'count * 1',
        lang: 'expression',
      },
      gap_policy: 'skip',
    },
  },
};
