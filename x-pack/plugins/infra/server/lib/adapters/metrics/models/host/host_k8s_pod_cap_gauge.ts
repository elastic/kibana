/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostK8sPodCapGauge: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostK8sPodCapGauge',
  map_field_to: 'kubernetes.node.name',
  requires: 'kubernetes.node',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'capacity',
      metrics: [
        {
          field: 'kubernetes.node.pod.capacity.total',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'kubernetes.pod.name',
          id: '93132a60-125f-11e8-8022-539b3f6b1a83',
          type: InfraMetricModelMetricType.cardinality,
        },
        {
          id: '9ed2ac40-125f-11e8-8022-539b3f6b1a83',
          script: 'params.used / params.cap',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: 'a31a19f0-125f-11e8-8022-539b3f6b1a83',
              name: 'cap',
            },
            {
              field: '93132a60-125f-11e8-8022-539b3f6b1a83',
              id: 'a98d6850-125f-11e8-8022-539b3f6b1a83',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
