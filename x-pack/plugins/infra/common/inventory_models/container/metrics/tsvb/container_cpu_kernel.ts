/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD } from '../../../../constants';
import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const containerCpuKernel: TSVBMetricModelCreator = (
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'containerCpuKernel',
  requires: ['docker.cpu'],
  index_pattern: indexPattern,
  interval,
  time_field: TIMESTAMP_FIELD,
  type: 'timeseries',
  series: [
    {
      id: 'kernel',
      split_mode: 'everything',
      metrics: [
        {
          field: 'docker.cpu.kernel.pct',
          id: 'avg-cpu-kernel',
          type: 'avg',
        },
      ],
    },
  ],
});
