/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostSystemOverview: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
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
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          field: 'system.cpu.system.pct',
          id: 'avg-cpu-system',
          type: 'avg',
        },
        {
          id: 'calc-user-system-cores',
          script: '(params.users + params.system) / params.cores',
          type: 'calculation',
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
          type: 'avg',
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
          type: 'avg',
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
          type: 'max',
        },
        {
          field: 'max-net-in',
          id: 'deriv-max-net-in',
          type: 'derivative',
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-net-in',
          type: 'calculation',
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-net-in' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          function: 'sum',
          id: 'seriesagg-sum',
          type: 'series_agg',
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
          type: 'max',
        },
        {
          field: 'max-net-out',
          id: 'deriv-max-net-out',
          type: 'derivative',
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-net-out',
          type: 'calculation',
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-net-out' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          function: 'sum',
          id: 'seriesagg-sum',
          type: 'series_agg',
        },
      ],
    },
  ],
});
