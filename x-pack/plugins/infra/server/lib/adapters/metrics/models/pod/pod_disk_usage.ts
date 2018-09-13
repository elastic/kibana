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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.rootfs.capacity.bytes',
          id: 'f4758d10-0b94-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '064c81b0-0b95-11e8-80a8-fddde751524a',
          script: 'params.used / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: '08d46510-0b95-11e8-80a8-fddde751524a',
              name: 'used',
            },
            {
              field: 'f4758d10-0b94-11e8-80a8-fddde751524a',
              id: '0d108820-0b95-11e8-80a8-fddde751524a',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
