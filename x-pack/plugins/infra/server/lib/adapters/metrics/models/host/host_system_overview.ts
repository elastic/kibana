/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostSystemOverview: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostSystemOverview',
  requires: 'system',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.cpu.user.pct',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: '61ca57f2-469d-11e7-af02-69e470af7412',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'system.cpu.system.pct',
          id: '753313e0-11b3-11e8-aa1e-011950aa2162',
          type: InfraMetricModelMetricType.avg,
        },
        {
          id: '85ba4c70-11b2-11e8-bb55-05a1612ce1b6',
          script: '(params.users + params.system) / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: '877fca30-11b2-11e8-bb55-05a1612ce1b6',
              name: 'users',
            },
            {
              field: '753313e0-11b3-11e8-aa1e-011950aa2162',
              id: '82b41be0-11b3-11e8-aa1e-011950aa2162',
              name: 'system',
            },
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7412',
              id: '82b41be0-11b3-11e8-aa1e-011950aa2163',
              name: 'cores',
            },
          ],
        },
      ],
    },
    {
      id: 'load',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.load.5',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'memory',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.memory.actual.used.pct',
          id: '753313e0-11b3-11e8-aa1e-011950aa2162',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'terms',
      terms_field: 'system.network.name',
      metrics: [
        {
          field: 'system.network.in.bytes',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'be823190-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'be823190-0b76-11e8-84d7-1d34a708be9c',
          id: 'c2c8dbf0-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
        {
          function: 'sum',
          id: 'c7ff2100-0b77-11e8-a6ba-c96b1f1b873f',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
    },
    {
      id: 'tx',
      split_mode: 'terms',
      terms_field: 'system.network.name',
      metrics: [
        {
          field: 'system.network.out.bytes',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'be823190-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'be823190-0b76-11e8-84d7-1d34a708be9c',
          id: 'c2c8dbf0-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
        {
          function: 'sum',
          id: 'c7ff2100-0b77-11e8-a6ba-c96b1f1b873f',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
    },
  ],
});
