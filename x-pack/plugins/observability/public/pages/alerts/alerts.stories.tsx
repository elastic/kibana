/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { IntlProvider } from 'react-intl';
import { AlertsPage } from '.';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

export default {
  title: 'app/Alerts',
  component: AlertsPage,
  decorators: [
    (Story: ComponentType) => {
      return (
        <IntlProvider locale="en">
          <KibanaContextProvider
            services={{
              data: { query: {} },
              docLinks: { links: { query: {} } },
              uiSettings: {
                get: (setting: string) => {
                  if (setting === 'dateFormat') {
                    return '';
                  } else {
                    return [];
                  }
                },
              },
              storage: { get: () => {} },
            }}
          >
            <Story />
          </KibanaContextProvider>
        </IntlProvider>
      );
    },
  ],
};

export function Example() {
  const items = [
    { '@timestamp': new Date().toISOString(), severity: 'critical', reason: 'Some reason' },
  ];
  return <AlertsPage items={items} routeParams={{ query: {} }} />;
}

export function EmptyState() {
  return <AlertsPage routeParams={{ query: {} }} />;
}
