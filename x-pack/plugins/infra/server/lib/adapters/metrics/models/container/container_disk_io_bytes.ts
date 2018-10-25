/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerDiskIOBytes: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
) => ({
  id: 'containerDiskIOBytes',
  requires: ['docker.disk'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'read',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.diskio.read.bytes',
          id: 'avg-diskio-bytes',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'write',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.diskio.write.bytes',
          id: 'avg-diskio-bytes',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
  ],
});
