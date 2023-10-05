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
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { ServerlessSearchContext } from './hooks/use_kibana';

export async function renderApp(
  element: HTMLElement,
  core: CoreStart,
  services: ServerlessSearchContext
) {
  const { ElasticsearchOverview } = await import('./components/overview');
  const queryClient = new QueryClient();
  ReactDOM.render(
    <KibanaThemeProvider theme={core.theme}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <I18nProvider>
            <ElasticsearchOverview />
          </I18nProvider>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
}
