/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { TGridModel } from '@kbn/timelines-plugin/public';
import { observabilityFeatureId } from '../../common';
import { ALERT_TABLE_STATE_STORAGE_KEY } from '../pages/alerts/containers/alerts_page/alerts_page';
import { columns } from '../pages/alerts/containers/alerts_table_t_grid/alerts_table_t_grid';

const registerAlertsTableConfiguration = (registry: AlertsTableConfigurationRegistryContract) => {
  const storage = new Storage(window.localStorage);
  const tGridState: Partial<TGridModel> | null = storage.get(ALERT_TABLE_STATE_STORAGE_KEY);
  const alertO11yColumns = tGridState?.columns ?? columns;

  registry.register({
    id: observabilityFeatureId,
    columns: alertO11yColumns,
  });
};

export { registerAlertsTableConfiguration };
