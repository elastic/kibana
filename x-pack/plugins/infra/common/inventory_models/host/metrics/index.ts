/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cpu } from './snapshot/cpu';
import { count } from '../../shared/metrics/snapshot/count';
import { load } from './snapshot/load';
import { logRate } from './snapshot/log_rate';
import { memory } from './snapshot/memory';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';

import { hostSystemOverview } from './tsvb/host_system_overview';
import { hostCpuUsage } from './tsvb/host_cpu_usage';
import { hostLoad } from './tsvb/host_load';
import { hostMemoryUsage } from './tsvb/host_memory_usage';
import { hostNetworkTraffic } from './tsvb/host_network_traffic';
import { hostFilesystem } from './tsvb/host_filesystem';

import { hostK8sOverview } from './tsvb/host_k8s_overview';
import { hostK8sCpuCap } from './tsvb/host_k8s_cpu_cap';
import { hostK8sPodCap } from './tsvb/host_k8s_pod_cap';
import { hostK8sDiskCap } from './tsvb/host_k8s_disk_cap';
import { hostK8sMemoryCap } from './tsvb/host_k8s_memory_cap';

import { hostDockerTop5ByMemory } from './tsvb/host_docker_top_5_by_memory';
import { hostDockerTop5ByCpu } from './tsvb/host_docker_top_5_by_cpu';
import { hostDockerOverview } from './tsvb/host_docker_overview';
import { hostDockerInfo } from './tsvb/host_docker_info';

import { InventoryMetrics } from '../../types';

export const metrics: InventoryMetrics = {
  tsvb: {
    hostSystemOverview,
    hostCpuUsage,
    hostLoad,
    hostMemoryUsage,
    hostNetworkTraffic,
    hostFilesystem,
    hostK8sOverview,
    hostK8sCpuCap,
    hostK8sPodCap,
    hostK8sDiskCap,
    hostK8sMemoryCap,
    hostDockerOverview,
    hostDockerInfo,
    hostDockerTop5ByMemory,
    hostDockerTop5ByCpu,
  },
  snapshot: { count, cpu, load, logRate, memory, rx, tx },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
