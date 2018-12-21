/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostK8sPodCap: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostK8sPodCap',
  requires: ['kubernetes.node'],
  map_field_to: 'kubernetes.node.name',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',

  series: [
    {
      id: 'capacity',
      metrics: [
        {
          field: 'kubernetes.node.pod.allocatable.total',
          id: 'max-pod-cap',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'kubernetes.pod.name',
          id: 'avg-pod',
          type: InfraMetricModelMetricType.cardinality,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
