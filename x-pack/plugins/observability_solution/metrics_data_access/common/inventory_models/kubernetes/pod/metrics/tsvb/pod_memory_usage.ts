/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../../types';

export const podMemoryUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'podMemoryUsage',
  requires: ['kubernetes.pod'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'memory',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.memory.usage.node.pct',
          id: 'avg-memory-without',
          type: 'avg',
        },
        {
          field: 'kubernetes.pod.memory.usage.limit.pct',
          id: 'avg-memory-with',
          type: 'avg',
        },
        {
          id: 'memory-usage',
          type: 'calculation',
          variables: [
            { id: 'memory_with', name: 'with_limit', field: 'avg-memory-with' },
            { id: 'memory_without', name: 'without_limit', field: 'avg-memory-without' },
          ],
          script: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
        },
      ],
    },
  ],
});
