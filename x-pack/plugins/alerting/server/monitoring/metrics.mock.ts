/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics } from '@opentelemetry/api-metrics';
import { Metrics } from './metrics';

export const metricsMock = {
  create: () => new Metrics(metrics.getMeter('kibana.alerting.metrics.mock')),
};
