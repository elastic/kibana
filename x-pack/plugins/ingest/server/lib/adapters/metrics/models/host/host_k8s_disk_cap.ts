/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostK8sDiskCap: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostK8sDiskCap',
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
          field: 'kubernetes.node.fs.capacity.bytes',
          id: 'max-fs-cap',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'kubernetes.node.fs.used.bytes',
          id: 'avg-fs-used',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
