/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostDockerTop5ByMemory: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostDockerTop5ByMemory',
  requires: ['docker.memory'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'avg-memory',
      metrics: [
        {
          field: 'docker.memory.usage.pct',
          id: 'avg-memory-metric',
          type: 'avg',
        },
      ],
      split_mode: 'terms',
      terms_field: 'container.name',
      terms_order_by: 'avg-memory',
      terms_size: 5,
    },
  ],
});
