/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';

import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Router } from '@kbn/shared-ux-router';
import { ServerlessSearchContext } from './hooks/use_kibana';

export async function renderApp(
  element: HTMLElement,
  core: CoreStart,
  services: ServerlessSearchContext,
  queryClient: QueryClient
) {
  const { ConnectorsRouter } = await import('./components/connectors_router');
  const root = createRoot(element);
  root.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <I18nProvider>
            <Router history={services.history}>
              <ConnectorsRouter />
            </Router>
          </I18nProvider>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
  return () => root.unmount();
}
