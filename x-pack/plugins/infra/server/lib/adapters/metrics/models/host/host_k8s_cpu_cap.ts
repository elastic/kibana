/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostK8sCpuCap: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostK8sCpuCap',
  map_field_to: 'kubernetes.node.name',
  requires: 'kubernetes.node',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'capacity',
      metrics: [
        {
          field: 'kubernetes.node.cpu.allocatable.nanocores',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'kubernetes.node.cpu.usage.nanocores',
          id: '1a1a9021-10df-11e8-935b-53cd349a4008',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
