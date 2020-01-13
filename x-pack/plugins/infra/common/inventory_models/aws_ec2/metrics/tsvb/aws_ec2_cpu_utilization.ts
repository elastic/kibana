/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTSVBModel } from '../../../create_tsvb_model';

export const awsEC2CpuUtilization = createTSVBModel(
  'awsEC2CpuUtilization',
  ['aws.ec2'],
  [
    {
      id: 'total',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.cpu.total.pct',
          id: 'avg-cpu',
          type: 'avg',
        },
        {
          id: 'convert-to-percent',
          script: 'params.avg / 100',
          type: 'calculation',
          variables: [
            {
              field: 'avg-cpu',
              id: 'var-avg',
              name: 'avg',
            },
          ],
        },
      ],
    },
  ]
);
