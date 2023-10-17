/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';

export { hostSnapshotMetricTypes } from './metrics';

export const host: InventoryModel = {
  id: 'host',
  displayName: i18n.translate('xpack.infra.inventoryModel.host.displayName', {
    defaultMessage: 'Hosts',
  }),
  singularDisplayName: i18n.translate('xpack.infra.inventoryModels.host.singularDisplayName', {
    defaultMessage: 'Host',
  }),
  requiredModule: 'system',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'host.name',
    name: 'host.name',
    os: 'host.os.name',
    ip: 'host.ip',
    cloudProvider: 'cloud.provider',
  },
  metrics,
  tooltipMetrics: ['cpu', 'memory', 'tx', 'rx'],
};
