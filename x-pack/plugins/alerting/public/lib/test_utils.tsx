/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of, BehaviorSubject } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { euiDarkVars } from '@kbn/ui-theme';
import type { ILicense } from '@kbn/licensing-plugin/public';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

/* eslint-disable no-console */

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

interface AppMockRendererArgs {
  license?: ILicense | null;
}

export interface AppMockRenderer {
  render: UiRender;
  coreStart: CoreStart;
  queryClient: QueryClient;
  AppWrapper: React.FC<{ children: React.ReactElement }>;
}

export const createAppMockRenderer = ({ license }: AppMockRendererArgs = {}): AppMockRenderer => {
  const theme$ = of({ eui: euiDarkVars, darkMode: true });

  const licensingPluginMock = licensingMock.createStart();

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
  const core = coreMock.createStart();
  const services = {
    ...core,
    licensing:
      license != null
        ? { ...licensingPluginMock, license$: new BehaviorSubject(license) }
        : licensingPluginMock,
  };
  const AppWrapper: React.FC<{ children: React.ReactElement }> = React.memo(({ children }) => (
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </KibanaContextProvider>
      </KibanaThemeProvider>
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
