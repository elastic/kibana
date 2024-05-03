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
import { DataViewsPublicPlugin } from '@kbn/data-views-plugin/public/plugin';
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import { SavedObjectsService } from '@kbn/core-saved-objects-server-internal';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
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

  const initializerContext = coreMock.createPluginInitializerContext();

  const dataViewService = new DataViewsPublicPlugin(initializerContext);

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

  const configService = configServiceMock.create({
    rawConfig: {
      maxImportPayloadBytes: {
        getValueInBytes: jest.fn(),
      },
      maxImportExportSize: jest.fn(),
      allowHttpApiAccess: true,
    },
    getConfig$: {
      maxImportPayloadBytes: {
        getValueInBytes: jest.fn(),
      },
      maxImportExportSize: jest.fn(),
      allowHttpApiAccess: true,
    },
    atPath: { skip_deprecated_settings: ['hello', 'world'] },
  });

  const savedObjectsCore = {
    ...coreMock.createSetup(),
    // savedObjects,
    http: httpService.start(),
    plugins: {
      ...coreMock.createSetup().plugins,
      onSetup: jest.fn(),
      onStart: jest.fn(),
    },
    logger: {
      get: () => ({
        debug: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        info: jest.fn(),
      }),
    },
    env: {
      packageInfo: {
        branch: 'main',
        buildNum: 123,
        version: '8.0.0',
        buildSha: 'abc123',
      },
    },
    configService,
  };

  const savedObjects = new SavedObjectsService(savedObjectsCore);
  savedObjects.setup({
    http: {
      ...httpService.start(),
      createRouter: () => ({
        post: jest.fn(),
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        handleLegacyErrors: jest.fn(),
      }),
    },
    elasticsearch: elasticsearchClientMock.createElasticsearchClient(),
    coreUsageData: {
      registerType: jest.fn(),
    },
    deprecations: {
      getRegistry: jest.fn(),
    },
  });

  const dataViewCore = {
    ...coreMock.createSetup(),
    savedObjects: savedObjects.start({
      elasticsearch: elasticsearchClientMock.createElasticsearchClient(),
    }),
    http: httpService.start(),
    plugins: {
      ...coreMock.createSetup().plugins,
      onSetup: jest.fn(),
      onStart: jest.fn(),
    },
    deprecations: coreMock.createSetup().deprecations,
  };

  dataViewService.setup(dataViewCore, {
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
    contentManagement: {
      registry: {
        register: jest.fn(),
      },
    },
  });

  const dependencies = {
    ...deps,
    data: {
      ...deps.data,
      dataViews: dataViewService.start(dataViewCore, {
        fieldFormats: {},
        contentManagement: {
          registry: {
            get: jest.fn(),
          },
        },
      }),
    },
  };

  return (
    <KibanaContextProvider services={{ ...core, ...dependencies }}>
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
