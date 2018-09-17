/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerOverview: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'containerOverview',
  requires: 'docker',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.cpu.total.pct',
          id: 'avg-cpu-total',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'memory',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.memory.usage.pct',
          id: 'avg-memory',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'tx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.network.out.bytes',
          id: 'max-network-out',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-network-out',
          id: 'deriv-max-network-out',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'deriv-max-network-out',
          id: 'posonly-deriv-max-network-out',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.network.in.bytes',
          id: 'max-network-in',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-network-in',
          id: 'deriv-max-network-in',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'deriv-max-network-in',
          id: 'posonly-deriv-max-network-in',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
      ],
    },
  ],
});
