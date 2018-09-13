/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const podLogUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'podLogUsage',
  requires: 'kubernetes.pod',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'logs',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.container.logs.used.bytes',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.logs.capacity.bytes',
          id: '716139f0-0b95-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '7cc9e940-0b95-11e8-80a8-fddde751524a',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: '7ed5bed0-0b95-11e8-80a8-fddde751524a',
              name: 'usage',
            },
            {
              field: '716139f0-0b95-11e8-80a8-fddde751524a',
              id: '8e267dc0-0b95-11e8-80a8-fddde751524a',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
