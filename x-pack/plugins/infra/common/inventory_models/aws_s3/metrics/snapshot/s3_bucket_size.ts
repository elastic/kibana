/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotModel } from '../../../types';

export const s3BucketSize: SnapshotModel = {
  s3BucketSize: {
    max: {
      field: 'aws.s3_daily_storage.bucket.size.bytes',
    },
  },
};
