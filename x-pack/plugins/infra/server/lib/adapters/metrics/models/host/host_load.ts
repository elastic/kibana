/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostLoad: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostLoad',
  requires: 'system.cpu',
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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'load_5m',
      metrics: [
        {
          field: 'system.load.5',
          id: '78bee3f0-0b77-11e8-a6ba-c96b1f1b873f',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'load_15m',
      metrics: [
        {
          field: 'system.load.15',
          id: '8798ec40-0b77-11e8-a6ba-c96b1f1b873f',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
