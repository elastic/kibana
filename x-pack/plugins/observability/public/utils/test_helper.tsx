/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { merge } from 'lodash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as testLibRender } from '@testing-library/react';
import { AppMountParameters } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import translations from '@kbn/translations-plugin/translations/ja-JP.json';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

import { PluginContext } from '../context/plugin_context/plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';
import { ConfigSchema } from '../plugin';
import { Subset } from '../typings';

const appMountParameters = { setHeaderActionMenu: () => {} } as unknown as AppMountParameters;
const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();

export const core = coreMock.createStart();
export const data = dataPluginMock.createStartContract();

const defaultConfig: ConfigSchema = {
  unsafe: {
    alertDetails: {
      logs: { enabled: false },
      metrics: { enabled: false },
      uptime: { enabled: false },
    },
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {},
  },
});

export const render = (component: React.ReactNode, config: Subset<ConfigSchema> = {}) => {
  return testLibRender(
    <IntlProvider locale="en-US" messages={translations.messages}>
      <KibanaContextProvider
        services={{
          ...core,
          data,
          exploratoryView: {
            createExploratoryViewUrl: jest.fn(),
            getAppDataView: jest.fn(),
            ExploratoryViewEmbeddable: () => <div>Embeddable exploratory view</div>,
          },
        }}
      >
        <PluginContext.Provider
          value={{
            appMountParameters,
            config: merge(defaultConfig, config),
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate: KibanaPageTemplate,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <EuiThemeProvider>{component}</EuiThemeProvider>
          </QueryClientProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    </IntlProvider>
  );
};
