/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { ServerlessSearchContext } from './hooks/use_kibana';

export async function renderApp(
  element: HTMLElement,
  core: CoreStart,
  services: ServerlessSearchContext,
  queryClient: QueryClient
) {
  const { ElasticsearchOverview } = await import('./components/overview');
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <Router history={services.history}>
            <Routes>
              <Route>
                <ElasticsearchOverview />
              </Route>
            </Routes>
          </Router>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
}
