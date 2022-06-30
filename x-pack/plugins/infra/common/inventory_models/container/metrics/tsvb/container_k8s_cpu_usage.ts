/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const k8sContainerCpuUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'k8sContainerCpuUsage',
  requires: ['kubernetes.container'],
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
          field: 'kubernetes.container.cpu.usage.node.pct',
          id: 'avg-cpu-without',
          type: 'avg',
        },
        {
          field: 'kubernetes.container.cpu.usage.limit.pct',
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
