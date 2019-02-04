/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const podLogUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'podLogUsage',
  requires: ['kubernetes.pod'],
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
          id: 'avg-log-used',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.logs.capacity.bytes',
          id: 'max-log-cap',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-usage-limit',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-log-userd',
              id: 'var-usage',
              name: 'usage',
            },
            {
              field: 'max-log-cap',
              id: 'var-limit',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
