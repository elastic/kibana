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
import { chromeServiceMock, coreMock } from '@kbn/core/public/mocks';
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
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import moment from 'moment/moment';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
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

  const uiSettingsMock = {
    get: (key: string) => {
      if (key === 'bfetch:disableCompression') {
        return true;
      }
      return core.uiSettings.get(key);
    },
    isDefault: () => {
      return true;
    },
  } as unknown as IUiSettingsClient;

  initializerContext.config.get = jest.fn().mockReturnValue({
    search: {
      aggs: { shardDelay: { enabled: false } },
      sessions: {
        enabled: false,
        defaultExpiration: moment.duration(1000, 'ms'),
      },
      asyncSearch: {
        waitForCompletion: moment.duration(100, 'ms'),
        keepAlive: moment.duration(1000, 'ms'),
        batchedReduceSize: 64,
      },
    },
  });

  const searchService = new SearchService(initializerContext);

  const bfetchPlugin = new BfetchPublicPlugin(initializerContext);
  bfetchPlugin.setup(coreMock.createSetup(), {});

  const bfetch = bfetchPlugin.start(coreMock.createStart(), {});

  // console.log('bfetch.batchedFunction', bfetch.batchedFunction);

  // const bfetch = bfetchPluginMock.createSetupContract();

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

  const fatalErrors = coreMock.createSetup().fatalErrors;
  const analytics = coreMock.createSetup().analytics;
  const executionContextService = new ExecutionContextService();
  const executionContextSetup = executionContextService.setup({
    analytics,
  });

  const httpService = new HttpService();
  httpService.setup({
    injectedMetadata: {
      getKibanaBranch: () => 'main',
      getKibanaBuildNumber: () => 123,
      getKibanaVersion: () => '8.0.0',
      getBasePath: () => 'http://localhost',
      getServerBasePath: () => 'http://localhost',
      getPublicBaseUrl: () => 'http://localhost',
      getAssetsHrefBase: () => 'http://localhost',
      getExternalUrlConfig: () => ({
        policy: [],
      }),
    },
    fatalErrors,
    executionContext: executionContextSetup,
  });

  const search = searchService.start(
    {
      analytics,
      http: httpService.start(),
      // uiSettings: core.uiSettings,
      uiSettings: {
        ...core.uiSettings,
        get: uiSettingsMock.get,
      },
      // chrome: chromeServiceMock.createStartContract(),
      chrome: jest.fn(),
    },
    {
      fieldFormats: {},
      indexPatterns: {},
      inspector: {},
      screenshotMode: screenshotModePluginMock.createStartContract(),
      scriptedFieldsEnabled: true,
    }
  );

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
