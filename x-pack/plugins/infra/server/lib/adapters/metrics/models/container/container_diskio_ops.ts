/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerDiskIOOps: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'containerDiskIOOps',
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
          field: 'docker.diskio.read.ops',
          id: 'max-diskio-read-ops',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-diskio-read-ops',
          id: 'deriv-max-diskio-read-ops',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-diskio-read-ops',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-diskio-read-ops' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
      ],
    },
    {
      id: 'write',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.diskio.write.ops',
          id: 'max-diskio-write-ops',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-diskio-write-ops',
          id: 'deriv-max-diskio-write-ops',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-diskio-write-ops',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-diskio-write-ops' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          id: 'calc-invert-rate',
          script: 'params.rate * -1',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'posonly-deriv-max-diskio-write-ops',
              id: 'var-rate',
              name: 'rate',
            },
          ],
        },
      ],
    },
  ],
});
