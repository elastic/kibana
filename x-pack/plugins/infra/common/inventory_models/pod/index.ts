/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';
import { nginx as nginxRequiredMetrics } from '../shared/metrics/required_metrics';

export { podSnapshotMetricTypes } from './metrics';

export const pod: InventoryModel = {
  id: 'pod',
  displayName: i18n.translate('xpack.infra.inventoryModel.pod.displayName', {
    defaultMessage: 'Kubernetes Pods',
  }),
  singularDisplayName: i18n.translate('xpack.infra.inventoryModels.pod.singularDisplayName', {
    defaultMessage: 'Kubernetes Pod',
  }),
  requiredModule: 'kubernetes',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'kubernetes.pod.uid',
    name: 'kubernetes.pod.name',
    ip: 'kubernetes.pod.ip',
  },
  metrics,
  requiredMetrics: [
    'podOverview',
    'podCpuUsage',
    'podMemoryUsage',
    'podNetworkTraffic',
    ...nginxRequiredMetrics,
  ],
  tooltipMetrics: ['cpu', 'memory', 'rx', 'tx'],
};
