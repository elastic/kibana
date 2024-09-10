/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider } from '@tanstack/react-query';

import { Router } from '@kbn/shared-ux-router';
import { UsageTrackerContextProvider } from './contexts/usage_tracker_context';
import { initQueryClient } from './services/query_client';
import { SearchIndicesServicesContextDeps } from './types';

export const renderApp = async (
  App: React.FC<{}>,
  core: CoreStart,
  services: SearchIndicesServicesContextDeps,
  element: HTMLElement
) => {
  const queryClient = initQueryClient(core.notifications.toasts);
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <UsageTrackerContextProvider usageCollection={services.usageCollection}>
          <I18nProvider>
            <QueryClientProvider client={queryClient}>
              <Router history={services.history}>
                <App />
              </Router>
            </QueryClientProvider>
          </I18nProvider>
        </UsageTrackerContextProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
