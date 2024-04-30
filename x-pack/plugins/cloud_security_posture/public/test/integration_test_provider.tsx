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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/public/mocks';
import { fleetMock } from '@kbn/fleet-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { sessionStorageMock } from '@kbn/core-http-server-mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { plugin } from '@kbn/bfetch-plugin/public';
import { Server } from '@kbn/core-root-server-internal';
import { SearchService } from '@kbn/data-plugin/public/search';
import { Observable, of } from 'rxjs';
import type { CspClientPluginStartDeps } from '../types';

interface CspAppDeps {
  core: CoreStart;
  deps: Partial<CspClientPluginStartDeps>;
  params: AppMountParameters;
}

const filterManager = {
  getGlobalFilters: () => [],
  getAppFilters: () => [],
  getFetches$: () => new Observable(),
};

const initializerContext = new Server(
  coreMock.createPluginInitializerContext({
    cloudSecurityPosture: { enabled: true },
  }),
  'cloud_security_posture',
  new Map()
);
const searchService = new SearchService(initializerContext);
const mockCoreStart = coreMock.createStart();

initializerContext.setup();

const bfetch = plugin(initializerContext);

const mockCoreSetup = coreMock.createSetup();
searchService.setup(mockCoreSetup, {
  packageInfo: { version: '8' },
  bfetch,
  expressions: { registerFunction: jest.fn(), registerType: jest.fn() },
  management: managementPluginMock.createSetupContract(),
});

export const IntegrationTestProvider: React.FC<Partial<CspAppDeps>> = ({
  core = coreMock.createStart(),
  deps = {
    data: {
      query: {
        timefilter: {
          timefilter: {
            setTime: () => ({}),
            getAbsoluteTime: () => {
              return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
            },
            getTime: () => ({
              from: 'now-7d',
              to: 'now',
            }),
            getRefreshInterval: () => ({}),
            getFetch$: () => new Observable(),
            getAutoRefreshFetch$: () => new Observable(),
            calculateBounds: () => ({ min: undefined, max: undefined }),
            getTimeDefaults: () => ({}),
            createFilter: () => ({}),
          },
        },
        savedQueries: { findSavedQueries: () => Promise.resolve({ queries: [] as SavedQuery[] }) },
        queryString: {
          getDefaultQuery: () => {
            return { query: '', language: 'kuery' };
          },
          getUpdates$: () => new Observable(),
        },
        filterManager,
        getState: () => {
          return {
            filters: [],
            query: { query: '', language: 'kuery' },
          };
        },
        state$: new Observable(),
      },
      search: searchService.start(mockCoreStart, {
        fieldFormats: {} as any,
        indexPatterns: {} as any,
        inspector: {} as any,
        screenshotMode: screenshotModePluginMock.createStartContract(),
        scriptedFieldsEnabled: true,
      }),
      dataViews: {
        getIdsWithTitle: () => Promise.resolve([]),
        get: () =>
          window
            .fetch('http://localhost:5601/internal/data_views/fields')
            .then((res) => res.json()),
        find: () =>
          window
            .fetch('http://localhost:5601/internal/data_views/fields')
            .then((res) => res.json()),
      },
    },
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
