/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostNetworkTraffic: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostNetworkTraffic',
  requires: ['system.network'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
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
    {
      id: 'rx',
      metrics: [
        {
          field: 'host.network.ingress.bytes',
          id: 'avg-net-in',
          type: 'avg',
        },
        {
          id: 'calc-invert-rate',
          script: 'params.rate * -1',
          type: 'calculation',
          variables: [
            {
              field: 'avg-net-in',
              id: 'var-rate',
              name: 'rate',
            },
          ],
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
              field: 'calc-invert-rate',
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
  ],
});
