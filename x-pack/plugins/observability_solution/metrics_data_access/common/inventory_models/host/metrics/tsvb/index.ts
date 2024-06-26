/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostSystemOverview } from './host_system_overview';
import { hostCpuUsage } from './host_cpu_usage';
import { hostLoad } from './host_load';
import { hostMemoryUsage } from './host_memory_usage';
import { hostNetworkTraffic } from './host_network_traffic';
import { hostFilesystem } from './host_filesystem';

import { hostK8sOverview } from './host_k8s_overview';
import { hostK8sCpuCap } from './host_k8s_cpu_cap';
import { hostK8sPodCap } from './host_k8s_pod_cap';
import { hostK8sDiskCap } from './host_k8s_disk_cap';
import { hostK8sMemoryCap } from './host_k8s_memory_cap';

import { hostDockerTop5ByMemory } from './host_docker_top_5_by_memory';
import { hostDockerTop5ByCpu } from './host_docker_top_5_by_cpu';
import { hostDockerOverview } from './host_docker_overview';
import { hostDockerInfo } from './host_docker_info';

export const tsvb = {
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
};
