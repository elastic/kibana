/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApmMetric } from './classes';
import { SMALL_FLOAT } from '../../../../common/formatting';

export const metrics = {
  apm_requests: new ApmMetric({
    field: 'beats_stats.metrics.apm-server.server.request.count',
    label: 'Client Requests',
    description:
      'Total number of client requests received by the APM instance.',
    format: SMALL_FLOAT,
    metricAgg: 'sum',
    units: ''
  })
};
