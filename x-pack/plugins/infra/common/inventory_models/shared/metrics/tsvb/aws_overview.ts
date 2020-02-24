/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsOverview: TSVBMetricModelCreator = (timeField, indexPattern): TSVBMetricModel => ({
  id: 'awsOverview',
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  interval: '>=5m',
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'cpu-util',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.cpu.total.pct',
          id: 'cpu-total-pct',
          type: 'max',
        },
      ],
    },
    {
      id: 'status-check-failed',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.status.check_failed',
          id: 'status-check-failed',
          type: 'max',
        },
      ],
    },
    {
      id: 'packets-out',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.network.out.packets',
          id: 'network-out-packets',
          type: 'avg',
        },
      ],
    },
    {
      id: 'packets-in',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.network.in.packets',
          id: 'network-in-packets',
          type: 'avg',
        },
      ],
    },
  ],
});
