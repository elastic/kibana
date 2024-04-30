/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { Plugin as NavigationPublicPlugin } from '@kbn/navigation-plugin/public';
import { Observable, of } from 'rxjs';
import { SearchBar, UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { identity } from 'lodash';
import React, { useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SavedQuery } from '@kbn/data-plugin/common';
// eslint-disable-next-line no-restricted-imports
import { Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { plugin } from '@kbn/bfetch-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { Server } from '@kbn/core-root-server-internal';
import { SearchService } from '@kbn/data-plugin/public/search';

export class LocalStorageMock {
  private store: Record<string, unknown>;
  constructor(defaultStore: Record<string, unknown>) {
    this.store = defaultStore;
  }
  clear() {
    this.store = {};
  }
  get(key: string) {
    return this.store[key] || null;
  }
  set(key: string, value: unknown) {
    this.store[key] = String(value);
  }
  remove(key: string) {
    delete this.store[key];
  }
}

const filterManager = {
  getGlobalFilters: () => [],
  getAppFilters: () => [],
  getFetches$: () => new Observable(),
};

export const uiSettingsMock = {
  get: (key: string) => {
    return true;
  },
  isDefault: () => {
    return true;
  },
};

const theme = {
  theme$: of({ darkMode: false }),
};

const NavigationPlugin = new NavigationPublicPlugin({} as PluginInitializerContext);

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

export const services = {
  core: {
    http: { basePath: { prepend: () => void 0 } },
    notifications: { toasts: {} },
    docLinks: { links: { discover: {} } },
    theme,
  },
  storage: new LocalStorageMock({}) as unknown as Storage,
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
        window.fetch('http://localhost:5601/internal/data_views/fields').then((res) => res.json()),
      find: () =>
        window.fetch('http://localhost:5601/internal/data_views/fields').then((res) => res.json()),
    },
  },
  uiSettings: uiSettingsMock,
  dataViewFieldEditor: {
    openEditor: () => void 0,
    userPermissions: {
      editIndexPattern: () => void 0,
    },
  },
  navigation: NavigationPlugin.start({} as CoreStart, {
    unifiedSearch: {
      ui: { SearchBar, AggregateQuerySearchBar: SearchBar },
    } as unknown as UnifiedSearchPublicPluginStart,
  }),
  theme,
  capabilities: {
    visualize: {
      show: true,
    },
    discover: {
      save: false,
    },
    advancedSettings: {
      save: true,
    },
  },
  docLinks: { links: { discover: {} } },
  addBasePath: (path: string) => path,
  filterManager,
  history: () => ({}),
  fieldFormats: {
    deserialize: () => {
      const DefaultFieldFormat = FieldFormat.from(identity);
      return new DefaultFieldFormat();
    },
  },
  toastNotifications: {
    addInfo: () => ({}),
  },
  lens: {
    EmbeddableComponent: <div>Histogram</div>,
  },
  unifiedSearch: {
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve([]),
      getQuerySuggestions: () => Promise.resolve([]),
    },
  },
};

export const IntegrationTestProvider: React.FC = ({ children }) => {
  const history = {
    push: () => void 0,
    replace: () => void 0,
    createHref: () => '',
    location: { pathname: '', search: '', hash: '', state: {} },
    listen: () => () => void 0,
    block: () => () => void 0,
  } as any;

  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <I18nProvider>{children}</I18nProvider>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
