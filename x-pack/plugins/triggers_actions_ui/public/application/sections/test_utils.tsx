/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/react';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { KibanaThemeProvider } from '@kbn/react';

import { TriggersAndActionsUiServices } from '../..';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';

/* eslint-disable no-console */

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

export interface AppMockRenderer {
  render: UiRender;
  coreStart: TriggersAndActionsUiServices;
  queryClient: QueryClient;
  AppWrapper: React.FC<{ children: React.ReactElement }>;
}

export const createAppMockRenderer = (): AppMockRenderer => {
  const services = createStartServicesMock();
  const theme$ = of({ darkMode: false });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    /**
     * React query prints the errors in the console even though
     * all tests are passings. We turn them off for testing.
     */
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = React.memo(({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <KibanaThemeProvider theme$={theme$}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </KibanaThemeProvider>
      </KibanaContextProvider>
    </I18nProvider>
  ));

  AppWrapper.displayName = 'AppWrapper';

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };

  return {
    coreStart: services,
    render,
    queryClient,
    AppWrapper,
  };
};
