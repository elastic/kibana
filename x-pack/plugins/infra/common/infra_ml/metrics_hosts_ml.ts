/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const metricsHostsJobTypeRT = rt.keyof({
  hosts_memory_usage: null,
  hosts_network_in: null,
  hosts_network_out: null,
});

export type MetricsHostsJobType = rt.TypeOf<typeof metricsHostsJobTypeRT>;

export const metricsHostsJobTypes: MetricsHostsJobType[] = [
  'hosts_memory_usage',
  'hosts_network_in',
  'hosts_network_out',
];
