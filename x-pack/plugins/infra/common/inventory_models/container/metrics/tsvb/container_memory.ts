/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const containerMemory: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'containerMemory',
  requires: ['docker.memory'],
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
          field: 'docker.memory.usage.pct',
          id: 'avg-memory',
          type: 'avg',
        },
      ],
    },
  ],
});
