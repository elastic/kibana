/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu } from './snapshot/cpu';
import { diskLatency } from './snapshot/disk_latency';
import { diskSpaceUsage } from './snapshot/disk_space_usage';
import { count } from '../../shared/metrics/snapshot/count';
import { load } from './snapshot/load';
import { logRate } from './snapshot/log_rate';
import { memory } from './snapshot/memory';
import { memoryFree } from './snapshot/memory_free';
import { memoryTotal } from './snapshot/memory_total';
import { normalizedLoad1m } from './snapshot/normalized_load_1m';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';

import { InventoryMetrics } from '../../types';

const exposedHostSnapshotMetrics = {
  cpu,
  diskLatency,
  diskSpaceUsage,
  load,
  logRate,
  memory,
  memoryFree,
  memoryTotal,
  normalizedLoad1m,
  rx,
  tx,
};
// not sure why this is the only model with "count"
const hostSnapshotMetrics = { count, ...exposedHostSnapshotMetrics };

export const hostSnapshotMetricTypes = Object.keys(exposedHostSnapshotMetrics) as Array<
  keyof typeof exposedHostSnapshotMetrics
>;

export const metrics: InventoryMetrics = {
  snapshot: hostSnapshotMetrics,
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
