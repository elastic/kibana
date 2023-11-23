/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { InventoryModel } from '../../types';
import { metrics } from './metrics';

export const node: InventoryModel<typeof metrics> = {
  id: 'node',
  displayName: i18n.translate('xpack.metricsData.inventoryModel.node.displayName', {
    defaultMessage: 'Kubernetes Nodes',
  }),
  singularDisplayName: i18n.translate(
    'xpack.metricsData.inventoryModels.node.singularDisplayName',
    {
      defaultMessage: 'Kubernetes Node',
    }
  ),
  requiredModule: 'kubernetes',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: true,
    uptime: true,
  },
  fields: {
    id: 'kubernetes.node.uid',
    name: 'kubernetes.node.name',
  },
  metrics,
  requiredMetrics: [],
  tooltipMetrics: [],
};
