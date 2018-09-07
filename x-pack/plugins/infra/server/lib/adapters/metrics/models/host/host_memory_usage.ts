/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostMemoryUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostMemoryUsage',
  requires: 'system.memory',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'free',
      metrics: [
        {
          field: 'system.memory.free',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'system.memory.actual.used.bytes',
          id: '0b5ad9f1-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'cache',
      metrics: [
        {
          field: 'system.memory.actual.used.bytes',
          id: '36aa0a41-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.memory.used.bytes',
          id: '3c1adcc0-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.avg,
        },
        {
          id: '434c9920-0b76-11e8-84d7-1d34a708be9c',
          script: 'params.used - params.actual',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '36aa0a41-0b76-11e8-84d7-1d34a708be9c',
              id: '474f83c0-0b76-11e8-84d7-1d34a708be9c',
              name: 'actual',
            },
            {
              field: '3c1adcc0-0b76-11e8-84d7-1d34a708be9c',
              id: '4e709e50-0b76-11e8-84d7-1d34a708be9c',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
