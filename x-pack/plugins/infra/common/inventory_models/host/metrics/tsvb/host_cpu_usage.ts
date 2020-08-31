/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostCpuUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostCpuUsage',
  requires: ['system.cpu'],
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
          id: 'avg-cpu-user',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
            {
              field: 'avg-cpu-user',
              id: 'var-avg',
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
          id: 'avg-cpu-system',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
            {
              field: 'avg-cpu-system',
              id: 'var-avg',
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
          id: 'avg-cpu-steal',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'avg-cpu-steal',
              id: 'var-avg',
              name: 'avg',
            },
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
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
          id: 'avg-cpu-irq',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
            {
              field: 'avg-cpu-irq',
              id: 'var-avg',
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
          id: 'avg-cpu-softirq',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
            {
              field: 'avg-cpu-softirq',
              id: 'var-avg',
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
          id: 'avg-cpu-iowait',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
            {
              field: 'avg-cpu-iowait',
              id: 'var-avg',
              name: 'avg',
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
          id: 'avg-cpu-nice',
          type: 'avg',
        },
        {
          field: 'system.cpu.cores',
          id: 'max-cpu-cores',
          type: 'max',
        },
        {
          id: 'calc-avg-cores',
          script: 'params.avg / params.cores',
          type: 'calculation',
          variables: [
            {
              field: 'max-cpu-cores',
              id: 'var-cores',
              name: 'cores',
            },
            {
              field: 'avg-cpu-nice',
              id: 'var-avg',
              name: 'avg',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
