/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const containerNetworkTraffic: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'containerNetworkTraffic',
  requires: ['docker.network'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'tx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.network.out.bytes',
          id: 'avg-network-out',
          type: 'avg',
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
          type: 'avg',
        },
        {
          id: 'invert-posonly-deriv-max-network-in',
          script: 'params.rate * -1',
          type: 'calculation',
          variables: [
            {
              field: 'avg-network-in',
              id: 'var-rate',
              name: 'rate',
            },
          ],
        },
      ],
    },
  ],
});
