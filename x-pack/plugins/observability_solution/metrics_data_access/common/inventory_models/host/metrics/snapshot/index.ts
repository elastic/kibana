/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuTotal } from './cpu_total';
import { cpu } from './cpu';
import { diskLatency } from './disk_latency';
import { diskSpaceUsage } from './disk_space_usage';
import { count } from '../../../shared/metrics/snapshot/count';
import { load } from './load';
import { logRate } from './log_rate';
import { memory } from './memory';
import { memoryFree } from './memory_free';
import { memoryTotal } from './memory_total';
import { normalizedLoad1m } from './normalized_load_1m';
import { rx } from './rx';
import { tx } from './tx';
import { txV2 } from './tx_v2';
import { rxV2 } from './rx_v2';

export const snapshot = {
  cpuTotal,
  cpu,
  diskLatency,
  diskSpaceUsage,
  count,
  load,
  logRate,
  memory,
  memoryFree,
  memoryTotal,
  normalizedLoad1m,
  rx,
  tx,
  rxV2,
  txV2,
};
