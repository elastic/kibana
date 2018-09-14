/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const podDiskUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'podDiskUsage',
  requires: 'kubernetes.pod',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'disk',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.container.rootfs.used.bytes',
          id: 'avg-rootfs-used',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.rootfs.capacity.bytes',
          id: 'max-rootfs-cap',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-used-limit',
          script: 'params.used / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-rootfs-used',
              id: 'var-used',
              name: 'used',
            },
            {
              field: 'max-rootfs-cap',
              id: 'var-limit',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
