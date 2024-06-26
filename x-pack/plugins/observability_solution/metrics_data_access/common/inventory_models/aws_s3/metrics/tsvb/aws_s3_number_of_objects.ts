/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsS3NumberOfObjects = createTSVBModel(
  'awsS3NumberOfObjects',
  ['aws.s3_daily_storage'],
  [
    {
      id: 'objects',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.s3_daily_storage.number_of_objects',
          id: 'max-size',
          type: 'max',
        },
      ],
    },
  ],
  '>=86400s',
  false
);
