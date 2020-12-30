/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostMemoryUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostMemoryUsage',
  requires: ['system.memory'],
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
          id: 'avg-memory-free',
          type: 'avg',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'system.memory.actual.used.bytes',
          id: 'avg-memory-used',
          type: 'avg',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'cache',
      metrics: [
        {
          field: 'system.memory.actual.used.bytes',
          id: 'avg-memory-actual-used',
          type: 'avg',
        },
        {
          field: 'system.memory.used.bytes',
          id: 'avg-memory-used',
          type: 'avg',
        },
        {
          id: 'calc-used-actual',
          script: 'params.used - params.actual',
          type: 'calculation',
          variables: [
            {
              field: 'avg-memory-actual-used',
              id: 'var-actual',
              name: 'actual',
            },
            {
              field: 'avg-memory-used',
              id: 'var-used',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
