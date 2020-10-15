/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsSQSMessagesDelayed = createTSVBModel(
  'awsSQSMessagesDelayed',
  ['aws.sqs'],
  [
    {
      id: 'delayed',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.sqs.messages.delayed',
          id: 'avg-delayed',
          type: 'avg',
        },
      ],
    },
  ],
  '>=300s'
);
