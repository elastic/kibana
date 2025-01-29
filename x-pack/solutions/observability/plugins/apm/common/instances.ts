/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const instancesSortFieldRt = t.keyof({
  serviceNodeName: null,
  latency: null,
  throughput: null,
  errorRate: null,
  cpuUsage: null,
  memoryUsage: null,
});

export type InstancesSortField = t.TypeOf<typeof instancesSortFieldRt>;
