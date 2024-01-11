/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import React, { useMemo } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
// eslint-disable-next-line no-restricted-imports
import { Router } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/public/mocks';
import { fleetMock } from '@kbn/fleet-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { sessionStorageMock } from '@kbn/core-http-server-mocks';
import type { CspClientPluginStartDeps } from '../types';

interface CspAppDeps {
  core: CoreStart;
  deps: Partial<CspClientPluginStartDeps>;
  params: AppMountParameters;
}

export const TestProvider: React.FC<Partial<CspAppDeps>> = ({
  core = coreMock.createStart(),
  deps = {
    data: dataPluginMock.createStartContract(),
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    charts: chartPluginMock.createStartContract(),
    discover: discoverPluginMock.createStartContract(),
    fleet: fleetMock.createStartMock(),
    licensing: licensingMock.createStart(),
    uiActions: uiActionsPluginMock.createStartContract(),
    storage: sessionStorageMock.create(),
  },
  params = coreMock.createAppMountParameters(),
  children,
} = {}) => {
  const queryClient = useMemo(() => new QueryClient(), []);
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
