/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerDiskIOOps: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'containerDiskIOOps',
  requires: 'docker.disk',
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
          field: 'docker.diskio.read.ops',
          id: 'avg-diskio-ops',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'avg-diskio-ops',
          id: 'deriv-avg-diskio-ops',
          type: InfraMetricModelMetricType.derivative,
        },
        {
          field: 'deriv-avg-diskio-ops',
          id: 'posonly-deriv-avg-diskio-ops',
          type: InfraMetricModelMetricType.positive_only,
        },
      ],
    },
    {
      id: 'write',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.diskio.write.ops',
          id: 'avg-diskio-ops',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'avg-diskio-ops',
          id: 'deriv-avg-diskio-ops',
          type: InfraMetricModelMetricType.derivative,
        },
        {
          field: 'deriv-avg-diskio-ops',
          id: 'posonly-deriv-avg-diskio-ops',
          type: InfraMetricModelMetricType.positive_only,
        },
      ],
    },
  ],
});
