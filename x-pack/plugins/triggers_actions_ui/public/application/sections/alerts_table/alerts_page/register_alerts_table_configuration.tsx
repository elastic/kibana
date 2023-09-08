/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { PLUGIN_ID } from '../../../../common/constants';
import { AlertsTableConfigurationRegistry } from '../../../../types';
import { TypeRegistry } from '../../../type_registry';

const AlertsPageFlyoutHeader = lazy(() => import('./alerts_page_flyout_header'));
const AlertsPageFlyoutBody = lazy(() => import('./alerts_page_flyout_body'));

const useInternalFlyout = () => ({
  body: AlertsPageFlyoutBody,
  header: AlertsPageFlyoutHeader,
  footer: null,
});

export function registerAlertsTableConfiguration({
  alertsTableConfigurationRegistry,
}: {
  alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry>;
}) {
  alertsTableConfigurationRegistry.register({
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
        schema: 'datetime',
      },
      {
        id: 'kibana.alert.duration.us',
        displayAsText: 'Duration',
        initialWidth: 150,
        schema: 'numeric',
      },
      {
        id: 'kibana.alert.reason',
        displayAsText: 'Reason',
      },
    ],
    useInternalFlyout,
    getRenderCellValue: () => (props) => {
      const myProps = props as any;
      const value = myProps.data.find((d: any) => d.field === myProps.columnId)?.value ?? [];
      return <>{value.length ? value.join() : '--'}</>;
    },
    sort: [
      {
        'event.action': {
          order: 'asc',
        },
      },
    ],
  });
}
