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
import { SearchService } from '@kbn/data-plugin/public/search';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { BfetchPublicPlugin } from '@kbn/bfetch-plugin/public/plugin';
import { SearchServiceSetupDependencies } from '@kbn/data-plugin/public/search/search_service';
import { bfetchPluginMock } from '@kbn/bfetch-plugin/server/mocks';
import type { CspClientPluginStartDeps } from '../types';

interface CspAppDeps {
  core: CoreStart;
  // deps: Partial<CspClientPluginStartDeps>;
  params: AppMountParameters;
}

export const IntegrationTestProvider: React.FC<Partial<CspAppDeps>> = ({
  core = coreMock.createStart(),
  params = coreMock.createAppMountParameters(),
  children,
} = {}) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  const initializerContext = coreMock.createPluginInitializerContext();

  initializerContext.config.get = jest.fn().mockReturnValue({
    search: { aggs: { shardDelay: { enabled: false } }, sessions: { enabled: true } },
  });

  const searchService = new SearchService(initializerContext);

  // const bfetchPlugin = new BfetchPublicPlugin(initializerContext);
  // bfetchPlugin.setup(coreMock.createSetup(), {});

  // const bfetch = bfetchPlugin.start(coreMock.createStart(), {});

  const bfetch = bfetchPluginMock.createSetupContract();

  searchService.setup(coreMock.createSetup(), {
    packageInfo: { version: '8' },
    bfetch,
    expressions: {
      registerFunction: jest.fn(),
      registerType: jest.fn(),
      getFunction: jest.fn(),
      getFunctions: jest.fn(),
      getTypes: jest.fn(),
      fork: jest.fn(),
      registerRenderer: jest.fn(),
      getAllMigrations: jest.fn(),
    },
    management: managementPluginMock.createSetupContract(),
  } as unknown as SearchServiceSetupDependencies);

  const search = searchService.start({}, {});

  const data: Partial<CspClientPluginStartDeps>['data'] = {
    ...dataPluginMock.createStartContract(),
    search,
  };

  const deps: Partial<CspClientPluginStartDeps> = {
    data,
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    charts: chartPluginMock.createStartContract(),
    discover: discoverPluginMock.createStartContract(),
    fleet: fleetMock.createStartMock(),
    licensing: licensingMock.createStart(),
    uiActions: uiActionsPluginMock.createStartContract(),
    storage: sessionStorageMock.create(),
  };

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
