/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';
export const awsEC2DiskIOBytes = createTSVBModel(
  'awsEC2DiskIOBytes',
  ['aws.ec2'],
  [
    {
      id: 'write',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.diskio.write.bytes_per_sec',
          id: 'avg-write',
          type: 'avg',
        },
      ],
    },
    {
      id: 'read',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.diskio.read.bytes_per_sec',
          id: 'avg-read',
          type: 'avg',
        },
        {
          id: 'calculation-rate',
          type: 'calculation',
          variables: [{ id: 'rate-var', name: 'rate', field: 'avg-read' }],
          script: 'params.rate * -1',
        },
      ],
    },
  ]
);
