/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cpu } from './snapshot/cpu';
import { memory } from './snapshot/memory';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';

import { podOverview } from './tsvb/pod_overview';
import { podCpuUsage } from './tsvb/pod_cpu_usage';
import { podLogUsage } from './tsvb/pod_log_usage';
import { podMemoryUsage } from './tsvb/pod_memory_usage';
import { podNetworkTraffic } from './tsvb/pod_network_traffic';
import { InventoryMetrics } from '../../types';

export const metrics: InventoryMetrics = {
  tsvb: {
    podOverview,
    podCpuUsage,
    podLogUsage,
    podNetworkTraffic,
    podMemoryUsage,
  },
  snapshot: { cpu, memory, rx, tx },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
