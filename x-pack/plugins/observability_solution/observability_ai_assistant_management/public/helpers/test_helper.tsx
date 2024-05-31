/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as testLibRender } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import translations from '@kbn/translations-plugin/translations/ja-JP.json';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { merge } from 'lodash';
import { DeepPartial } from 'utility-types';
import { AppContextProvider, AppContextValue } from '../context/app_context';
import { RedirectToHomeIfUnauthorized } from '../routes/components/redirect_to_home_if_unauthorized';
import { aIAssistantManagementObservabilityRouter } from '../routes/config';
import { CoreStartWithStartDeps } from '../hooks/use_kibana';

export const coreStartMock = coreMock.createStart();

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

export const render = (
  component: React.ReactNode,
  mocks?: { coreStart?: DeepPartial<CoreStartWithStartDeps>; appContextValue?: AppContextValue }
) => {
  const history = createMemoryHistory();

  const startDeps = {
    observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
  };

  const mergedCoreStartMock = merge(
    coreStartMock,
    {
      application: {
        capabilities: {
          management: {
            kibana: {
              observabilityAiAssistantManagement: true,
            },
          },
          observabilityAIAssistant: {
            show: true,
          },
        },
      },
    },
    mocks?.coreStart
  );

  const appContextValue = mocks?.appContextValue ?? {
    setBreadcrumbs: () => {},
  };

  return testLibRender(
    // @ts-ignore
    <IntlProvider locale="en-US" messages={translations.messages}>
      <RedirectToHomeIfUnauthorized coreStart={mergedCoreStartMock}>
        <KibanaContextProvider services={{ ...mergedCoreStartMock, ...startDeps }}>
          <AppContextProvider value={appContextValue}>
            <QueryClientProvider client={queryClient}>
              <RouterProvider
                history={history}
                router={aIAssistantManagementObservabilityRouter as any}
              >
                {component}
              </RouterProvider>
            </QueryClientProvider>
          </AppContextProvider>
        </KibanaContextProvider>
      </RedirectToHomeIfUnauthorized>
    </IntlProvider>
  );
};
