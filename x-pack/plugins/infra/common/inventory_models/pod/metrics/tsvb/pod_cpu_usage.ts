/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const podCpuUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'podCpuUsage',
  requires: ['kubernetes.pod'],
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
          field: 'kubernetes.pod.cpu.usage.node.pct',
          id: 'avg-cpu-without',
          type: 'avg',
        },
        {
          field: 'kubernetes.pod.cpu.usage.limit.pct',
          id: 'avg-cpu-with',
          type: 'avg',
        },
        {
          id: 'cpu-usage',
          type: 'calculation',
          variables: [
            { id: 'cpu_with', name: 'with_limit', field: 'avg-cpu-with' },
            { id: 'cpu_without', name: 'without_limit', field: 'avg-cpu-without' },
          ],
          script: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
        },
      ],
    },
  ],
});
