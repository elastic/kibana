/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  type: 'top_n',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'system.cpu.total.norm.pct',
          id: 'avg-cpu-total',
          type: 'avg',
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
      metrics: [
        {
          field: 'host.network.ingress.bytes',
          id: 'avg-net-in',
          type: 'avg',
        },
        {
          id: 'max-period',
          type: 'max',
          field: 'metricset.period',
        },
        {
          id: '3216b170-f192-11ec-a8e3-dd984b7213e2',
          type: 'calculation',
          variables: [
            {
              id: '34e64c30-f192-11ec-a8e3-dd984b7213e2',
              name: 'value',
              field: 'avg-net-in',
            },
            {
              id: '3886cb80-f192-11ec-a8e3-dd984b7213e2',
              name: 'period',
              field: 'max-period',
            },
          ],
          script: 'params.value / (params.period / 1000)',
        },
      ],
      filter: {
        language: 'kuery',
        query: 'host.network.ingress.bytes : * ',
      },
      split_mode: 'everything',
    },
    {
      id: 'tx',
      metrics: [
        {
          field: 'host.network.egress.bytes',
          id: 'avg-net-out',
          type: 'avg',
        },
        {
          id: 'max-period',
          type: 'max',
          field: 'metricset.period',
        },
        {
          id: '3216b170-f192-11ec-a8e3-dd984b7213e2',
          type: 'calculation',
          variables: [
            {
              id: '34e64c30-f192-11ec-a8e3-dd984b7213e2',
              name: 'value',
              field: 'avg-net-out',
            },
            {
              id: '3886cb80-f192-11ec-a8e3-dd984b7213e2',
              name: 'period',
              field: 'max-period',
            },
          ],
          script: 'params.value / (params.period / 1000)',
        },
      ],
      filter: {
        language: 'kuery',
        query: 'host.network.egress.bytes : * ',
      },
      split_mode: 'everything',
    },
  ],
});
