/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const container: InventoryModel = {
  id: 'container',
  displayName: i18n.translate('xpack.infra.inventoryModel.container.displayName', {
    defaultMessage: 'Docker Containers',
  }),
  singularDisplayName: i18n.translate('xpack.infra.inventoryModel.container.singularDisplayName', {
    defaultMessage: 'Docker Container',
  }),
  requiredModule: 'docker',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'container.id',
    name: 'container.name',
    ip: 'container.ip_address',
  },
  metrics,
  requiredMetrics: [
    'containerOverview',
    'containerCpuUsage',
    'containerMemory',
    'containerNetworkTraffic',
    'containerDiskIOBytes',
    'containerDiskIOOps',
  ],
  tooltipMetrics: ['cpu', 'memory', 'rx', 'tx'],
};
