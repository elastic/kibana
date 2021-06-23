/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils/target/technical_field_names';
import React, { ComponentType } from 'react';
import type { TopAlertResponse } from '../';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { PluginContext, PluginContextValue } from '../../../context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../../../rules/observability_rule_type_registry_mock';
import { apmAlertResponseExample } from '../example_data';
import { AlertsFlyout } from './';

interface Args {
  alerts: TopAlertResponse[];
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

export function Example({ alerts }: Args) {
  const selectedAlertId = apmAlertResponseExample[0][ALERT_UUID][0];
  const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();
  return (
    <AlertsFlyout
      alerts={alerts}
      observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
      selectedAlertId={selectedAlertId}
      onClose={() => {}}
    />
  );
}
Example.args = {
  alerts: apmAlertResponseExample,
} as Args;
