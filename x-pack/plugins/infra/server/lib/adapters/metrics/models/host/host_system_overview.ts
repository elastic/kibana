/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostSystemOverview: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostSystemOverview',
  requires: ['system.cpu', 'system.memory', 'system.load', 'system.network'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.cpu.user.pct',
          id: 'avg-cpu-user',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'system.cpu.system.pct',
          id: 'avg-cpu-system',
          type: InfraMetricModelMetricType.avg,
        },
        {
          id: 'calc-user-system-cores',
          script: '(params.users + params.system) / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-cpu-user',
              id: 'var-users',
              name: 'users',
            },
            {
              field: 'avg-cpu-system',
              id: 'var-system',
              name: 'system',
            },
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
          ],
        },
      ],
    },
    {
      id: 'load',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.load.5',
          id: 'avg-load-5m',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'memory',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.memory.actual.used.pct',
          id: 'avg-memory-actual-used',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'terms',
      terms_field: 'system.network.name',
      metrics: [
        {
          field: 'system.network.in.bytes',
          id: 'max-net-in',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-net-in',
          id: 'deriv-max-net-in',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-net-in',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-net-in' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          function: 'sum',
          id: 'seriesagg-sum',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
    },
    {
      id: 'tx',
      split_mode: 'terms',
      terms_field: 'system.network.name',
      metrics: [
        {
          field: 'system.network.out.bytes',
          id: 'max-net-out',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-net-out',
          id: 'deriv-max-net-out',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-net-out',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-net-out' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          function: 'sum',
          id: 'seriesagg-sum',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
    },
  ],
});
