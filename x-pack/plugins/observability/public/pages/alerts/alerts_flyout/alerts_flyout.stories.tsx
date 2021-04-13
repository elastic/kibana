/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { PluginContext, PluginContextValue } from '../../../context/plugin_context';
import { TopAlert } from '../alerts_table';
import { AlertsFlyout } from './';

interface Args {
  alert: TopAlert;
}

export default {
  title: 'app/Alerts/AlertsFlyout',
  component: AlertsFlyout,
  decorators: [
    (Story: ComponentType) => {
      return (
        <KibanaContextProvider
          services={{
            docLinks: { links: { query: {} } },
            storage: { get: () => {} },
            uiSettings: {
              get: (setting: string) => {
                if (setting === 'dateFormat') {
                  return 'MMM D, YYYY @ HH:mm:ss.SSS';
                }
              },
            },
          }}
        >
          {' '}
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
        //
      );
    },
  ],
};

export function Example({ alert }: Args) {
  return <AlertsFlyout alert={alert} onClose={() => {}} />;
}
Example.args = {
  alert: {
    link: '/app/apm/services/opbeans-java?rangeFrom=now-15m&rangeTo=now',
    reason: 'Error count for opbeans-java was above the threshold',
    active: true,
    start: 1618235449493,
    duration: 180057000,
    ruleCategory: 'Error count threshold',
    ruleName: 'Error count threshold | opbeans-java (smith test)',
    severityLevel: 'warning',
  },
} as Args;
