/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetric } from '../../../../../common/graphql/types';
import { InfraMetricModelCreator } from '../adapter_types';

import { hostCpuUsage } from './host/host_cpu_usage';
import { hostFilesystem } from './host/host_filesystem';
import { hostK8sCpuCap } from './host/host_k8s_cpu_cap';
import { hostK8sDiskCap } from './host/host_k8s_disk_cap';
import { hostK8sMemoryCap } from './host/host_k8s_memory_cap';
import { hostK8sOverview } from './host/host_k8s_overview';
import { hostK8sPodCap } from './host/host_k8s_pod_cap';
import { hostLoad } from './host/host_load';
import { hostMemoryUsage } from './host/host_memory_usage';
import { hostNetworkTraffic } from './host/host_network_traffic';
import { hostSystemOverview } from './host/host_system_overview';

import { podCpuUsage } from './pod/pod_cpu_usage';
import { podLogUsage } from './pod/pod_log_usage';
import { podMemoryUsage } from './pod/pod_memory_usage';
import { podNetworkTraffic } from './pod/pod_network_traffic';
import { podOverview } from './pod/pod_overview';

import { containerCpuKernel } from './container/container_cpu_kernel';
import { containerCpuUsage } from './container/container_cpu_usage';
import { containerDiskIOBytes } from './container/container_disk_io_bytes';
import { containerDiskIOOps } from './container/container_diskio_ops';
import { containerMemory } from './container/container_memory';
import { containerNetworkTraffic } from './container/container_network_traffic';
import { containerOverview } from './container/container_overview';
import { nginxActiveConnections } from './nginx/nginx_active_connections';
import { nginxHits } from './nginx/nginx_hits';
import { nginxRequestRate } from './nginx/nginx_request_rate';
import { nginxRequestsPerConnection } from './nginx/nginx_requests_per_connection';

interface InfraMetricModels {
  [key: string]: InfraMetricModelCreator;
}

export const metricModels: InfraMetricModels = {
  [InfraMetric.hostSystemOverview]: hostSystemOverview,
  [InfraMetric.hostCpuUsage]: hostCpuUsage,
  [InfraMetric.hostFilesystem]: hostFilesystem,
  [InfraMetric.hostK8sOverview]: hostK8sOverview,
  [InfraMetric.hostK8sCpuCap]: hostK8sCpuCap,
  [InfraMetric.hostK8sDiskCap]: hostK8sDiskCap,
  [InfraMetric.hostK8sMemoryCap]: hostK8sMemoryCap,
  [InfraMetric.hostK8sPodCap]: hostK8sPodCap,
  [InfraMetric.hostLoad]: hostLoad,
  [InfraMetric.hostMemoryUsage]: hostMemoryUsage,
  [InfraMetric.hostNetworkTraffic]: hostNetworkTraffic,

  [InfraMetric.podOverview]: podOverview,
  [InfraMetric.podCpuUsage]: podCpuUsage,
  [InfraMetric.podMemoryUsage]: podMemoryUsage,
  [InfraMetric.podLogUsage]: podLogUsage,
  [InfraMetric.podNetworkTraffic]: podNetworkTraffic,

  [InfraMetric.containerCpuKernel]: containerCpuKernel,
  [InfraMetric.containerCpuUsage]: containerCpuUsage,
  [InfraMetric.containerDiskIOBytes]: containerDiskIOBytes,
  [InfraMetric.containerDiskIOOps]: containerDiskIOOps,
  [InfraMetric.containerNetworkTraffic]: containerNetworkTraffic,
  [InfraMetric.containerMemory]: containerMemory,
  [InfraMetric.containerOverview]: containerOverview,
  [InfraMetric.nginxHits]: nginxHits,
  [InfraMetric.nginxRequestRate]: nginxRequestRate,
  [InfraMetric.nginxActiveConnections]: nginxActiveConnections,
  [InfraMetric.nginxRequestsPerConnection]: nginxRequestsPerConnection,
};
