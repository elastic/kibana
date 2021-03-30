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
import { PluginContext, PluginContextValue } from '../../context/plugin_context';
import { AlertsFlyout } from './alerts_flyout';
import { AlertItem } from './alerts_table';
import { eventLogPocData, wireframeData } from './example_data';

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
              storage: { get: () => {} },
              uiSettings: {
                get: (setting: string) => {
                  if (setting === 'dateFormat') {
                    return '';
                  } else {
                    return [];
                  }
                },
              },
            }}
          >
            <PluginContext.Provider
              value={
                ({
                  core: {
                    http: { basePath: { prepend: (_: string) => '' } },
                  },
                } as unknown) as PluginContextValue
              }
            >
              <Story />
            </PluginContext.Provider>
          </KibanaContextProvider>
        </IntlProvider>
      );
    },
  ],
};

export function Example() {
  return <AlertsPage items={wireframeData} routeParams={{ query: {} }} />;
}

export function EventLog() {
  return <AlertsPage items={eventLogPocData as AlertItem[]} routeParams={{ query: {} }} />;
}

export function EmptyState() {
  return <AlertsPage items={[]} routeParams={{ query: {} }} />;
}

export function Flyout() {
  return <AlertsFlyout {...wireframeData[0]} onClose={() => {}} />;
}
