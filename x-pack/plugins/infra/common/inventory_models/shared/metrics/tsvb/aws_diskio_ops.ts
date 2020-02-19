/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsDiskioOps: TSVBMetricModelCreator = (timeField, indexPattern): TSVBMetricModel => ({
  id: 'awsDiskioOps',
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
          field: 'aws.ec2.diskio.write.count',
          id: 'sum-diskio-writes',
          type: 'sum',
        },
        {
          id: 'csum-sum-diskio-writes',
          field: 'sum-diskio-writes',
          type: 'cumulative_sum',
        },
        {
          id: 'deriv-csum-sum-diskio-writes',
          unit: '1s',
          type: 'derivative',
          field: 'csum-sum-diskio-writes',
        },
        {
          id: 'posonly-deriv-csum-sum-diskio-writes',
          field: 'deriv-csum-sum-diskio-writes',
          type: 'positive_only',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'reads',
      metrics: [
        {
          field: 'aws.ec2.diskio.read.count',
          id: 'sum-diskio-reads',
          type: 'sum',
        },
        {
          id: 'csum-sum-diskio-reads',
          field: 'sum-diskio-reads',
          type: 'cumulative_sum',
        },
        {
          id: 'deriv-csum-sum-diskio-reads',
          unit: '1s',
          type: 'derivative',
          field: 'csum-sum-diskio-reads',
        },
        {
          id: 'posonly-deriv-csum-sum-diskio-reads',
          field: 'deriv-csum-sum-diskio-reads',
          type: 'positive_only',
        },
        {
          id: 'inverted-posonly-deriv-csum-sum-diskio-reads',
          type: 'calculation',
          variables: [
            { id: 'var-rate', name: 'rate', field: 'posonly-deriv-csum-sum-diskio-reads' },
          ],
          script: 'params.rate * -1',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
