/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const nginxActiveConnections: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
) => ({
  id: 'nginxActiveConnections',
  requires: ['nginx.stubstatus'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'connections',
      metrics: [
        {
          field: 'nginx.stubstatus.active',
          id: 'avg-active',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
