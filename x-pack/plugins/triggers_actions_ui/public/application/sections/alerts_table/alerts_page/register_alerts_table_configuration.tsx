/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { get } from 'lodash';
import { PLUGIN_ID } from '../../../../common/constants';
import { AlertsTableConfigurationRegistry } from '../../../../types';
import { TypeRegistry } from '../../../type_registry';

const AlertsPageFlyoutHeader = lazy(() => import('./alerts_page_flyout_header'));
const AlertsPageFlyoutBody = lazy(() => import('./alerts_page_flyout_body'));

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
    internalFlyout: {
      header: AlertsPageFlyoutHeader,
      body: AlertsPageFlyoutBody,
    },
    externalFlyout: {
      header: AlertsPageFlyoutHeader,
      body: AlertsPageFlyoutBody,
    },
    getRenderCellValue: () => (props) => {
      const myProps = props as any;
      // any is required here to improve typescript performance
      const value = get(myProps.data as any, myProps.field, [])[0] as string;
      return value ?? 'N/A';
    },
  });
}
