/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

// see discussion in: https://github.com/elastic/kibana/issues/42687

export const awsNetworkBytes: TSVBMetricModelCreator = (
  timeField,
  indexPattern
): TSVBMetricModel => ({
  id: 'awsNetworkBytes',
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  interval: '>=5m',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'tx',
      metrics: [
        {
          field: 'aws.ec2.network.out.bytes',
          id: 'sum-net-out',
          type: 'sum',
        },
        {
          id: 'csum-sum-net-out',
          field: 'sum-net-out',
          type: 'cumulative_sum',
        },
        {
          id: 'deriv-csum-sum-net-out',
          unit: '1s',
          type: 'derivative',
          field: 'csum-sum-net-out',
        },
        {
          id: 'posonly-deriv-csum-sum-net-out',
          field: 'deriv-csum-sum-net-out',
          type: 'positive_only',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'rx',
      metrics: [
        {
          field: 'aws.ec2.network.in.bytes',
          id: 'sum-net-in',
          type: 'sum',
        },
        {
          id: 'csum-sum-net-in',
          field: 'sum-net-in',
          type: 'cumulative_sum',
        },
        {
          id: 'deriv-csum-sum-net-in',
          unit: '1s',
          type: 'derivative',
          field: 'csum-sum-net-in',
        },
        {
          id: 'posonly-deriv-csum-sum-net-in',
          field: 'deriv-csum-sum-net-in',
          type: 'positive_only',
        },
        {
          id: 'inverted-posonly-deriv-csum-sum-net-in',
          type: 'calculation',
          variables: [{ id: 'var-rate', name: 'rate', field: 'posonly-deriv-csum-sum-net-in' }],
          script: 'params.rate * -1',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
