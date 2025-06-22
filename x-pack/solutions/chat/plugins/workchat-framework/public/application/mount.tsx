/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { Router } from '@kbn/shared-ux-router';
import type { InternalServices } from '../services';
import type { WorkChatFrameworkPluginStartDependencies } from '../types';
import { AppServicesContext } from './context/app_services_context';
import { AppRoutes } from './routes';

export const mountApp = async ({
  core,
  plugins,
  services,
  element,
  history,
}: {
  core: CoreStart;
  plugins: WorkChatFrameworkPluginStartDependencies;
  services: InternalServices;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  const kibanaServices = { ...core, plugins };
  const queryClient = new QueryClient();
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <AppServicesContext.Provider value={services}>
              <RedirectAppLinks coreStart={core}>
                <Router history={history}>
                  <AppRoutes />
                </Router>
              </RedirectAppLinks>
            </AppServicesContext.Provider>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
