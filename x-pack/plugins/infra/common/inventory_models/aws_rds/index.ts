/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { metrics } from './metrics';
import { InventoryModel } from '../types';

export const awsRDS: InventoryModel = {
  id: 'awsRDS',
  displayName: i18n.translate('xpack.infra.inventoryModels.awsRDS.displayName', {
    defaultMessage: 'RDS Databases',
  }),
  singularDisplayName: i18n.translate('xpack.infra.inventoryModels.awsRDS.singularDisplayName', {
    defaultMessage: 'RDS Database',
  }),
  requiredModule: 'aws',
  crosslinkSupport: {
    details: true,
    logs: true,
    apm: false,
    uptime: false,
  },
  metrics,
  fields: {
    id: 'aws.rds.db_instance.arn',
    name: 'aws.rds.db_instance.identifier',
  },
  requiredMetrics: [
    'awsRDSCpuTotal',
    'awsRDSConnections',
    'awsRDSQueriesExecuted',
    'awsRDSActiveTransactions',
    'awsRDSLatency',
  ],
};
