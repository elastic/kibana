/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetric } from '../../../../common/graphql/types';
import { InfraMetricLayout } from './types';

export const hostLayout: InfraMetricLayout[] = [
  {
    id: 'systemOverview',
    label: 'System Overview',
    requires: 'system',
    sections: [
      {
        id: InfraMetric.hostCpuUsage,
        label: 'CPU Usage',
        requires: 'system.cpu',
        config: { type: 'timeseries' },
      },
      {
        id: InfraMetric.hostLoad,
        label: 'Load',
        requires: 'system.load',
        config: { type: 'timeseries' },
      },
      {
        id: InfraMetric.hostMemoryUsage,
        label: 'MemoryUsage',
        requires: 'system.memory',
        config: { type: 'timeseries' },
      },
      {
        id: InfraMetric.hostNetworkTraffic,
        label: 'Network Traffic',
        requires: 'system.network',
        config: { type: 'timeseries' },
      },
    ],
  },
  {
    id: 'k8sOverview',
    label: 'Kubernetes Overview',
    requires: 'kubernetes',
    sections: [
      {
        id: InfraMetric.hostK8sCpuCap,
        label: 'Node CPU Capacity',
        requires: 'kubernetes.node',
        config: { type: 'timeseries' },
      },
      {
        id: InfraMetric.hostK8sMemoryCap,
        label: 'Node Memory Capacity',
        requires: 'kubernetes.node',
        config: { type: 'timeseries' },
      },
      {
        id: InfraMetric.hostK8sDiskCap,
        label: 'Node Disk Capacity',
        requires: 'kubernetes.node',
        config: { type: 'timeseries' },
      },
      {
        id: InfraMetric.hostK8sPodCap,
        label: 'Node Pod Capacity',
        requires: 'kubernetes.node',
        config: { type: 'timeseries' },
      },
    ],
  },
];
