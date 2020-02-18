/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostLoad: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostLoad',
  requires: ['system.cpu'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'load_1m',
      metrics: [
        {
          field: 'system.load.1',
          id: 'avg-load-1m',
          type: 'avg',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'load_5m',
      metrics: [
        {
          field: 'system.load.5',
          id: 'avg-load-5m',
          type: 'avg',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'load_15m',
      metrics: [
        {
          field: 'system.load.15',
          id: 'avg-load-15m',
          type: 'avg',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
