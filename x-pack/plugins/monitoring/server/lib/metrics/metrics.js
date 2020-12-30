/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metrics as elasticsearchMetrics } from './elasticsearch/metrics';
import { metrics as kibanaMetrics } from './kibana/metrics';
import { metrics as logstashMetrics } from './logstash/metrics';
import { metrics as beatsMetrics } from './beats/metrics';
import { metrics as apmMetrics } from './apm/metrics';

export const metrics = {
  ...elasticsearchMetrics,
  ...kibanaMetrics,
  ...logstashMetrics,
  ...beatsMetrics,
  ...apmMetrics,
};
