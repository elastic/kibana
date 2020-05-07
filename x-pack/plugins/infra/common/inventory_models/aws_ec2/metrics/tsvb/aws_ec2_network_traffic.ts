/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';
export const awsEC2NetworkTraffic = createTSVBModel(
  'awsEC2NetworkTraffic',
  ['aws.ec2'],
  [
    {
      id: 'tx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.network.out.bytes_per_sec',
          id: 'avg-tx',
          type: 'avg',
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.network.in.bytes_per_sec',
          id: 'avg-rx',
          type: 'avg',
        },
        {
          id: 'calculation-rate',
          type: 'calculation',
          variables: [{ id: 'rate-var', name: 'rate', field: 'avg-rx' }],
          script: 'params.rate * -1',
        },
      ],
    },
  ]
);
