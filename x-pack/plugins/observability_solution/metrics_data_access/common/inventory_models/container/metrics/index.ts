/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryMetricsWithCharts } from '../../types';
import { ContainerCharts } from './charts';
import type { ContainerFormulas } from './formulas';
import { cpu } from './snapshot/cpu';
import { memory } from './snapshot/memory';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';
import { containerCpuKernel } from './tsvb/container_cpu_kernel';
import { containerCpuUsage } from './tsvb/container_cpu_usage';
import { containerDiskIOBytes } from './tsvb/container_disk_io_bytes';
import { containerDiskIOOps } from './tsvb/container_diskio_ops';
import { containerK8sCpuUsage } from './tsvb/container_k8s_cpu_usage';
import { containerK8sMemoryUsage } from './tsvb/container_k8s_memory_usage';
import { containerK8sOverview } from './tsvb/container_k8s_overview';
import { containerMemory } from './tsvb/container_memory';
import { containerNetworkTraffic } from './tsvb/container_network_traffic';
import { containerOverview } from './tsvb/container_overview';

const containerSnapshotMetrics = { cpu, memory, rx, tx };

export const containerSnapshotMetricTypes = Object.keys(containerSnapshotMetrics) as Array<
  keyof typeof containerSnapshotMetrics
>;

export const metrics: InventoryMetricsWithCharts<ContainerFormulas, ContainerCharts> = {
  tsvb: {
    containerOverview,
    containerCpuUsage,
    containerCpuKernel,
    containerDiskIOOps,
    containerDiskIOBytes,
    containerNetworkTraffic,
    containerMemory,
    containerK8sCpuUsage,
    containerK8sOverview,
    containerK8sMemoryUsage,
  },
  snapshot: containerSnapshotMetrics,
  getFormulas: async () => await import('./formulas').then(({ formulas }) => formulas),
  getCharts: async () => await import('./charts').then(({ charts }) => charts),
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
