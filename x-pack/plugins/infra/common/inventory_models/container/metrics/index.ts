/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InventoryMetrics } from '../../types';
import { cpu } from './snapshot/cpu';
import { memory } from './snapshot/memory';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';

import { containerOverview } from './tsvb/container_overview';
import { containerCpuUsage } from './tsvb/container_cpu_usage';
import { containerCpuKernel } from './tsvb/container_cpu_kernel';
import { containerDiskIOOps } from './tsvb/container_diskio_ops';
import { containerDiskIOBytes } from './tsvb/container_disk_io_bytes';
import { containerMemory } from './tsvb/container_memory';
import { containerNetworkTraffic } from './tsvb/container_network_traffic';

export const metrics: InventoryMetrics = {
  tsvb: {
    containerOverview,
    containerCpuUsage,
    containerCpuKernel,
    containerDiskIOOps,
    containerDiskIOBytes,
    containerNetworkTraffic,
    containerMemory,
  },
  snapshot: { cpu, memory, rx, tx },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
