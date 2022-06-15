/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
export const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract
) => {
  if (registry.has('apm')) {
    return;
  }
  registry.register({
    id: 'apm',
    columns: [
      {
        id: '@timestamp',
        displayAsText: '@timestamp', //todo intern
        initialWidth: 250,
      },
      {
        id: 'event.action',
        displayAsText: 'Alert status',
        initialWidth: 150,
      },

      {
        id: 'kibana.alert.duration.us',
        displayAsText: 'Duration',
        initialWidth: 150,
      },
      {
        id: 'kibana.alert.reason',
        displayAsText: 'Reason',
      },
    ],
  });
};
