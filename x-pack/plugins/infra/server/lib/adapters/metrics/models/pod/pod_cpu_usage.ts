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
          id: 'avg-cpu-usage',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.cpu.limit.nanocores',
          id: 'max-cpu-limit',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-usage-limit',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-cpu-usage',
              id: 'var-usage',
              name: 'usage',
            },
            {
              field: 'max-cpu-limit',
              id: 'var-limit',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
