/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const nginxHits: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'nginxHits',
  requires: ['nginx.access'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: '200s',
      metrics: [
        {
          id: 'count-200',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: 'nginx.access.response_code:[200 TO 299]',
    },
    {
      id: '300s',
      metrics: [
        {
          id: 'count-300',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: 'nginx.access.response_code:[300 TO 399]',
    },
    {
      id: '400s',
      metrics: [
        {
          id: 'count-400',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: 'nginx.access.response_code:[400 TO 499]',
    },
    {
      id: '500s',
      metrics: [
        {
          id: 'count-500',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: 'nginx.access.response_code:[500 TO 599]',
    },
  ],
});
