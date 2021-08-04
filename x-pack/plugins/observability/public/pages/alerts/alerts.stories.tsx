/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertsPage } from '.';
import { HttpSetup } from '../../../../../../src/core/public';
import {
  KibanaContextProvider,
  KibanaPageTemplate,
} from '../../../../../../src/plugins/kibana_react/public';
import { PluginContext, PluginContextValue } from '../../context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { createCallObservabilityApi } from '../../services/call_observability_api';
import { dynamicIndexPattern } from './example_data';

export default {
  title: 'app/Alerts',
  component: AlertsPage,
  decorators: [
    (Story: ComponentType) => {
      createCallObservabilityApi(({
        get: async (endpoint: string) => {
          if (endpoint === '/api/observability/rules/alerts/dynamic_index_pattern') {
            return dynamicIndexPattern;
          }
        },
      } as unknown) as HttpSetup);

      return (
        <MemoryRouter>
          <IntlProvider locale="en">
            <KibanaContextProvider
              services={{
                application: { getUrlForApp: () => '' },
                data: { autocomplete: { hasQuerySuggestions: () => false }, query: {} },
                chrome: { docTitle: { change: () => {} } },
                docLinks: { links: { query: {} } },
                storage: { get: () => {} },
                timelines: { getTGrid: () => <></> },
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
                    observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
                    ObservabilityPageTemplate: KibanaPageTemplate,
                  } as unknown) as PluginContextValue
                }
              >
                <Story />
              </PluginContext.Provider>
            </KibanaContextProvider>
          </IntlProvider>
        </MemoryRouter>
      );
    },
  ],
};

export function Example() {
  return (
    <AlertsPage routeParams={{ query: { rangeFrom: 'now-15m', rangeTo: 'now', kuery: '' } }} />
  );
}

export function EmptyState() {
  return <AlertsPage routeParams={{ query: {} }} />;
}
