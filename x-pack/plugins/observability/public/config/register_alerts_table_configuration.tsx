/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_DURATION, ALERT_REASON, ALERT_STATUS, TIMESTAMP } from '@kbn/rule-data-utils';
import { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { observabilityFeatureId } from '../../common';
import { translations } from './translations';

export const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract
) => {
  registry.register({
    id: observabilityFeatureId,
    columns: [
      {
        displayAsText: translations.alertsTable.statusColumnDescription,
        id: ALERT_STATUS,
        initialWidth: 110,
      },
      {
        displayAsText: translations.alertsTable.lastUpdatedColumnDescription,
        id: TIMESTAMP,
        initialWidth: 230,
      },
      {
        displayAsText: translations.alertsTable.durationColumnDescription,
        id: ALERT_DURATION,
        initialWidth: 116,
      },
      {
        displayAsText: translations.alertsTable.reasonColumnDescription,
        id: ALERT_REASON,
      },
    ],
  });
};
