/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu } from './cpu';
import { diskLatency } from './disk_latency';
import { memoryTotal } from './memory_total';
import { memory } from './memory';
import { rx } from './rx';
import { tx } from './tx';

export const metricsAggregations = {
  cpu,
  diskLatency,
  memory,
  memoryTotal,
  rx,
  tx,
};
