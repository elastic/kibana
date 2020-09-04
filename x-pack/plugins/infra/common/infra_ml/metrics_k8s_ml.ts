/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const metricK8sJobTypeRT = rt.keyof({
  cpu_usage: null,
  memory_usage: null,
  network_in: null,
  network_out: null,
});

export type MetricK8sJobType = rt.TypeOf<typeof metricK8sJobTypeRT>;

export const metricsK8SJobTypes: MetricK8sJobType[] = [
  'cpu_usage',
  'memory_usage',
  'network_in',
  'network_out',
];
