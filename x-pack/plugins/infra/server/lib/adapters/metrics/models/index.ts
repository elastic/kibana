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
import { hostK8sCpuCapGauge } from './host/host_k8s_cpu_cap_gauge';
import { hostK8sDiskCap } from './host/host_k8s_disk_cap';
import { hostK8sDiskCapGauge } from './host/host_k8s_disk_cap_gauge';
import { hostK8sMemoryCap } from './host/host_k8s_memory_cap';
import { hostK8sMemoryCapGauge } from './host/host_k8s_memory_cap_gauge';
import { hostK8sOverview } from './host/host_k8s_overview';
import { hostK8sPodCap } from './host/host_k8s_pod_cap';
import { hostK8sPodCapGauge } from './host/host_k8s_pod_cap_gauge';
import { hostLoad } from './host/host_load';
import { hostMemoryUsage } from './host/host_memory_usage';
import { hostNetworkTraffic } from './host/host_network_traffic';
import { hostSystemOverview } from './host/host_system_overview';

interface InfraMetricModels {
  [key: string]: InfraMetricModelCreator;
}

export const metricModels: InfraMetricModels = {
  [InfraMetric.hostSystemOverview]: hostSystemOverview,
  [InfraMetric.hostCpuUsage]: hostCpuUsage,
  [InfraMetric.hostFilesystem]: hostFilesystem,
  [InfraMetric.hostK8sOverview]: hostK8sOverview,
  [InfraMetric.hostK8sCpuCap]: hostK8sCpuCap,
  [InfraMetric.hostK8sCpuCapGauge]: hostK8sCpuCapGauge,
  [InfraMetric.hostK8sDiskCap]: hostK8sDiskCap,
  [InfraMetric.hostK8sDiskCapGauge]: hostK8sDiskCapGauge,
  [InfraMetric.hostK8sMemoryCap]: hostK8sMemoryCap,
  [InfraMetric.hostK8sMemoryCapGauge]: hostK8sMemoryCapGauge,
  [InfraMetric.hostK8sPodCap]: hostK8sPodCap,
  [InfraMetric.hostK8sPodCapGauge]: hostK8sPodCapGauge,
  [InfraMetric.hostLoad]: hostLoad,
  [InfraMetric.hostMemoryUsage]: hostMemoryUsage,
  [InfraMetric.hostNetworkTraffic]: hostNetworkTraffic,
};
