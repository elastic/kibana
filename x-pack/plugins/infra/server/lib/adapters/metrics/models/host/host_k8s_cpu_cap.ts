/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostK8sCpuCap: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostK8sCpuCap',
  map_field_to: 'kubernetes.node.name',
  requires: ['kubernetes.node'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'capacity',
      metrics: [
        {
          field: 'kubernetes.node.cpu.allocatable.cores',
          id: 'max-cpu-cap',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-nanocores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              id: 'var-cores',
              field: 'max-cpu-cap',
              name: 'cores',
            },
          ],
          script: 'params.cores * 1000000000',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'kubernetes.node.cpu.usage.nanocores',
          id: 'avg-cpu-usage',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
