/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsSQSMessagesEmpty = createTSVBModel(
  'awsSQSMessagesEmpty',
  ['aws.sqs'],
  [
    {
      id: 'empty',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.sqs.messages.not_visible',
          id: 'avg-empty',
          type: 'avg',
        },
      ],
    },
  ],
  '>=300s'
);
