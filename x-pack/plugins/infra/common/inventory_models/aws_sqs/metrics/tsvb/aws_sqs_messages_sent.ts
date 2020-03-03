/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsSQSMessagesSent = createTSVBModel(
  'awsSQSMessagesSent',
  ['aws.sqs'],
  [
    {
      id: 'sent',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.sqs.messages.sent',
          id: 'avg-sent',
          type: 'avg',
        },
      ],
    },
  ],
  '>=300s'
);
