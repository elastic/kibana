/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerOverview: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'containerOverview',
  requires: ['docker'],
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
          id: 'avg-network-out',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.network.in.bytes',
          id: 'avg-network-in',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
  ],
});
