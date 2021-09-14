/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsRDSActiveTransactions = createTSVBModel(
  'awsRDSActiveTransactions',
  ['aws.rds'],
  [
    {
      id: 'active',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.transactions.active',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
    {
      id: 'blocked',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.transactions.blocked',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
  ]
);
