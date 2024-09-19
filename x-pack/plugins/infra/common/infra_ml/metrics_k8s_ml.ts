/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const metricK8sJobTypeRT = rt.keyof({
  k8s_memory_usage: null,
  k8s_network_in: null,
  k8s_network_out: null,
});

export type MetricK8sJobType = rt.TypeOf<typeof metricK8sJobTypeRT>;

export const metricsK8SJobTypes: MetricK8sJobType[] = [
  'k8s_memory_usage',
  'k8s_network_in',
  'k8s_network_out',
];
