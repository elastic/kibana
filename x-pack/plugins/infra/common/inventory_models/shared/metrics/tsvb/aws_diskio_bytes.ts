/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsDiskioBytes: TSVBMetricModelCreator = (
  timeField,
  indexPattern
): TSVBMetricModel => ({
  id: 'awsDiskioBytes',
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  interval: '>=5m',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'writes',
      metrics: [
        {
          field: 'aws.ec2.diskio.write.bytes',
          id: 'sum-diskio-out',
          type: 'sum',
        },
        {
          id: 'csum-sum-diskio-out',
          field: 'sum-diskio-out',
          type: 'cumulative_sum',
        },
        {
          id: 'deriv-csum-sum-diskio-out',
          unit: '1s',
          type: 'derivative',
          field: 'csum-sum-diskio-out',
        },
        {
          id: 'posonly-deriv-csum-sum-diskio-out',
          field: 'deriv-csum-sum-diskio-out',
          type: 'positive_only',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'reads',
      metrics: [
        {
          field: 'aws.ec2.diskio.read.bytes',
          id: 'sum-diskio-in',
          type: 'sum',
        },
        {
          id: 'csum-sum-diskio-in',
          field: 'sum-diskio-in',
          type: 'cumulative_sum',
        },
        {
          id: 'deriv-csum-sum-diskio-in',
          unit: '1s',
          type: 'derivative',
          field: 'csum-sum-diskio-in',
        },
        {
          id: 'posonly-deriv-csum-sum-diskio-in',
          field: 'deriv-csum-sum-diskio-in',
          type: 'positive_only',
        },
        {
          id: 'inverted-posonly-deriv-csum-sum-diskio-in',
          type: 'calculation',
          variables: [{ id: 'var-rate', name: 'rate', field: 'posonly-deriv-csum-sum-diskio-in' }],
          script: 'params.rate * -1',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
