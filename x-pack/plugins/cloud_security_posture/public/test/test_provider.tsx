/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
// eslint-disable-next-line no-restricted-imports
import { Router } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CspClientPluginStartDeps } from '../types';
import { getMockDependencies } from './fixtures/get_mock_dependencies';

interface CspAppDeps {
  core: CoreStart;
  deps: Partial<CspClientPluginStartDeps>;
  params: AppMountParameters;
  children: React.ReactNode;
}

export const TestProvider: React.FC<Partial<CspAppDeps>> = ({
  core = coreMock.createStart(),
  deps = getMockDependencies(),
  params = coreMock.createAppMountParameters(),
  children,
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <KibanaContextProvider services={{ ...core, ...deps }}>
      <QueryClientProvider client={queryClient}>
        <Router history={params.history}>
          <I18nProvider>
            <Routes>
              <Route path="*" render={() => <>{children}</>} />
            </Routes>
          </I18nProvider>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
