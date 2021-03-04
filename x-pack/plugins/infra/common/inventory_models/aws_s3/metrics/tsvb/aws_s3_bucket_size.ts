/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsS3BucketSize = createTSVBModel(
  'awsS3BucketSize',
  ['aws.s3_daily_storage'],
  [
    {
      id: 'bytes',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.s3_daily_storage.bucket.size.bytes',
          id: 'max-bytes',
          type: 'max',
        },
      ],
    },
  ],
  '>=86400s',
  false
);
