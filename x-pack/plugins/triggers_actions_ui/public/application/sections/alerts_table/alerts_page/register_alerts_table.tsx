/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from '../../../../common/constants';
import { AlertsTableRegistry } from '../../../../types';
import { TypeRegistry } from '../../../type_registry';

export function registerAlertsTable({
  alertsTableTypeRegistry,
}: {
  alertsTableTypeRegistry: TypeRegistry<AlertsTableRegistry>;
}) {
  alertsTableTypeRegistry.register({
    id: PLUGIN_ID,
    columns: [
      {
        id: 'event.action',
        displayAsText: 'Alert status',
        initialWidth: 150,
      },
      {
        id: '@timestamp',
        displayAsText: 'Last updated',
        initialWidth: 250,
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
}
