/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostCpuUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostCpuUsage',
  requires: 'system.cpu',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'user',
      metrics: [
        {
          field: 'system.cpu.user.pct',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: '396f9890-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '3f7494c0-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '396f9890-165b-11e8-9bad-a91e607f788a',
              id: '40fbd100-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: '474465e0-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'system',
      metrics: [
        {
          field: 'system.cpu.system.pct',
          id: '817456f1-0b73-11e8-8c14-876ef0896567',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: '54da0750-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '5aade160-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '54da0750-165b-11e8-9bad-a91e607f788a',
              id: '5d7d06f0-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
            {
              field: '817456f1-0b73-11e8-8c14-876ef0896567',
              id: '60a7e110-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'steal',
      metrics: [
        {
          field: 'system.cpu.steal.pct',
          id: 'c60ebf81-0b73-11e8-8c14-876ef0896567',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: '6abb87b0-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '7250e7e0-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'c60ebf81-0b73-11e8-8c14-876ef0896567',
              id: '74489930-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
            {
              field: '6abb87b0-165b-11e8-9bad-a91e607f788a',
              id: '799086f0-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'irq',
      metrics: [
        {
          field: 'system.cpu.irq.pct',
          id: 'd3812181-0b73-11e8-8c14-876ef0896567',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: '8718bae0-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '8fba33e0-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '8718bae0-165b-11e8-9bad-a91e607f788a',
              id: '926c5b90-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
            {
              field: 'd3812181-0b73-11e8-8c14-876ef0896567',
              id: '962f2ff0-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'softirq',
      metrics: [
        {
          field: 'system.cpu.softirq.pct',
          id: 'e5ff0481-0b73-11e8-8c14-876ef0896567',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: 'a0d18200-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'a7694850-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'a0d18200-165b-11e8-9bad-a91e607f788a',
              id: 'a8889b00-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
            {
              field: 'e5ff0481-0b73-11e8-8c14-876ef0896567',
              id: 'ada3fa80-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'iowait',
      metrics: [
        {
          field: 'system.cpu.iowait.pct',
          id: 'f356d9a1-0b73-11e8-8c14-876ef0896567',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: 'b8ac3a50-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'bda21070-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'f356d9a1-0b73-11e8-8c14-876ef0896567',
              id: 'bec840f0-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
            {
              field: 'b8ac3a50-165b-11e8-9bad-a91e607f788a',
              id: 'c25ab680-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'nice',
      metrics: [
        {
          field: 'system.cpu.nice.pct',
          id: '17b74a01-0b74-11e8-8c14-876ef0896567',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.cpu.cores',
          id: 'cca41320-165b-11e8-9bad-a91e607f788a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'd4bdbe80-165b-11e8-9bad-a91e607f788a',
          script: 'params.avg / params.cores',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'cca41320-165b-11e8-9bad-a91e607f788a',
              id: 'da655870-165b-11e8-9bad-a91e607f788a',
              name: 'cores',
            },
            {
              field: '17b74a01-0b74-11e8-8c14-876ef0896567',
              id: 'de82f700-165b-11e8-9bad-a91e607f788a',
              name: 'avg',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
