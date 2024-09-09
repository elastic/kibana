/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createObservabilityRuleTypeRegistryMock } from '@kbn/observability-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import translations from '@kbn/translations-plugin/translations/ja-JP.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as testLibRender } from '@testing-library/react';
import React from 'react';
import { PluginContext } from '../context/plugin_context';

const appMountParameters = { setHeaderActionMenu: () => {} } as unknown as AppMountParameters;
const observabilityRuleTypeRegistry = createObservabilityRuleTypeRegistryMock();

export const core = coreMock.createStart();
export const data = dataPluginMock.createStartContract();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
  logger: {
    // eslint-disable-next-line no-console
    log: console.log,
    // eslint-disable-next-line no-console
    warn: console.warn,
    error: () => {},
  },
});

export const render = (component: React.ReactNode) => {
  return testLibRender(
    // @ts-ignore
    <IntlProvider locale="en-US" messages={translations.messages}>
      <KibanaContextProvider
        services={{
          ...core,
          data,
          exploratoryView: {
            createExploratoryViewUrl: jest.fn(),
            getAppDataView: jest.fn(),
            // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
            ExploratoryViewEmbeddable: () => <div>Embeddable exploratory view</div>,
          },
        }}
      >
        <PluginContext.Provider
          value={{
            appMountParameters,
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
