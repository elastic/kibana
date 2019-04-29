/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerMemory: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
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
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
  ],
});
