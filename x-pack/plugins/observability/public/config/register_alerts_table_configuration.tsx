/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';

import { observabilityFeatureId } from '../../common';
import { columns as alertO11yColumns } from '../pages/alerts/containers/alerts_table_t_grid/alerts_table_t_grid';

const registerAlertsTableConfiguration = (registry: AlertsTableConfigurationRegistryContract) => {
  if (registry.has(observabilityFeatureId)) {
    return;
  }
  registry.register({
    id: observabilityFeatureId,
    columns: alertO11yColumns,
  });
};

export { registerAlertsTableConfiguration };
