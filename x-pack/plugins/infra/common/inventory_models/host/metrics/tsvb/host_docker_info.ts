/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostDockerInfo: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostDockerInfo',
  requires: ['docker.info'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'running',
      metrics: [
        {
          field: 'docker.info.containers.running',
          id: 'max-running',
          type: 'max',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'paused',
      metrics: [
        {
          field: 'docker.info.containers.paused',
          id: 'max-paused',
          type: 'max',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'stopped',
      metrics: [
        {
          field: 'docker.info.containers.stopped',
          id: 'max-stopped',
          type: 'max',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
