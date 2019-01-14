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
          id: 'max-diskio-read-bytes',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-diskio-read-bytes',
          id: 'deriv-max-diskio-read-bytes',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-diskio-read-bytes',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-diskio-read-bytes' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
      ],
    },
    {
      id: 'write',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.diskio.write.bytes',
          id: 'max-diskio-write-bytes',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-diskio-write-bytes',
          id: 'deriv-max-diskio-write-bytes',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-diskio-write-bytes',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-diskio-write-bytes' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          id: 'calc-invert-rate',
          script: 'params.rate * -1',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'posonly-deriv-max-diskio-write-bytes',
              id: 'var-rate',
              name: 'rate',
            },
          ],
        },
      ],
    },
  ],
});
