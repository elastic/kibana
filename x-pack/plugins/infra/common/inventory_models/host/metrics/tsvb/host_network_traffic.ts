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
      ],
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
      ],
      split_mode: 'everything',
    },
  ],
});
