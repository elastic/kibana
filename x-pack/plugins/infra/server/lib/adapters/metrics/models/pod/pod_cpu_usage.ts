/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const podCpuUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'podCpuUsage',
  requires: 'kubernetes.pod',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.container.cpu.usage.nanocores',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.cpu.limit.nanocores',
          id: 'ac8e11d0-0b93-11e8-8331-63375da80574',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'b3e00060-0b93-11e8-8331-63375da80574',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: 'b5dc93b0-0b93-11e8-8331-63375da80574',
              name: 'usage',
            },
            {
              field: 'ac8e11d0-0b93-11e8-8331-63375da80574',
              id: 'baac1d20-0b93-11e8-8331-63375da80574',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
