/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import { UI_SETTINGS } from '@kbn/observability-shared-plugin/public/hooks/use_kibana_ui_settings';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { createMemoryHistory } from 'history';
import { merge, noop } from 'lodash';
import type { ReactNode } from 'react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Observable, of } from 'rxjs';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { apmRouter } from '../../components/routing/apm_route_config';
import { createCallApmApi } from '../../services/rest/create_call_apm_api';
import type { APMServiceContextValue } from '../apm_service/apm_service_context';
import { APMServiceContext } from '../apm_service/apm_service_context';
import { MockTimeRangeContextProvider } from '../time_range_metadata/mock_time_range_metadata_context_provider';
import { ApmTimeRangeMetadataContextProvider } from '../time_range_metadata/time_range_metadata_context';
import type { ApmPluginContextValue } from './apm_plugin_context';
import { ApmPluginContext } from './apm_plugin_context';
import type { ConfigSchema } from '../..';

const coreStart = coreMock.createStart({ basePath: '/basepath' });

const uiSettings: Record<string, unknown> = {
  [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
    {
      from: 'now/d',
      to: 'now/d',
      display: 'Today',
    },
    {
      from: 'now/w',
      to: 'now/w',
      display: 'This week',
    },
  ],
  [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
    from: 'now-15m',
    to: 'now',
  },
  [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
    pause: false,
    value: 100000,
  },
  [enableInspectEsQueries]: false,
};

const urlService = new UrlService({
  navigate: async () => {},
  getUrl: async ({ app, path }, { absolute }) => {
    return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
  },
  shortUrls: () => ({ get: () => {} } as any),
});
const locator = urlService.locators.create(new MlLocatorDefinition());

const mockPlugin = {
  ml: {
    locator,
  },
  data: {
    query: {
      timefilter: { timefilter: { setTime: () => {}, getTime: () => ({}) } },
    },
  },
  share: {
    url: {
      locators: {
        get: jest.fn(),
      },
    },
  },
};

const mockCore = merge({}, coreStart, {
  application: {
    capabilities: {
      apm: {},
      ml: {},
      savedObjectsManagement: {},
    },
    currentAppId$: new Observable(),
    getUrlForApp: (appId: string) => '',
    navigateToUrl: (url: string) => {},
  },
  chrome: {
    docTitle: { change: () => {} },
    setBreadcrumbs: () => {},
    setHelpExtension: () => {},
    setBadge: () => {},
  },
  docLinks: {
    DOC_LINK_VERSION: '0',
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    links: {
      apm: {},
      observability: { guide: '' },
    },
  },
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`,
      get: () => '/basepath',
    },
  },
  i18n: {
    Context: ({ children }: { children: ReactNode }) => children,
  },
  notifications: {
    toasts: {
      addWarning: () => {},
      addDanger: () => {},
      add: () => {},
    },
  },
  uiSettings: {
    get: (key: string) => uiSettings[key],
    get$: (key: string) => of(mockCore.uiSettings.get(key)),
  },
  unifiedSearch: {
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve(false),
      getQuerySuggestions: () => [],
      getValueSuggestions: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([]);
          }, 300);
        }),
    },
    observabilityShared: {
      navigation: {
        PageTemplate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      },
    },
  },
  data: {
    query: {
      queryString: { getQuery: jest.fn(), setQuery: jest.fn(), clearQuery: jest.fn() },
      timefilter: {
        timefilter: {
          setTime: jest.fn(),
          setRefreshInterval: jest.fn(),
        },
      },
    },
  },
  dataViews: {
    create: jest.fn(),
  },
});

const mockConfig: ConfigSchema = {
  serviceMapEnabled: true,
  ui: {
    enabled: true,
  },
  latestAgentVersionsUrl: '',
  serverlessOnboarding: false,
  managedServiceUrl: '',
  featureFlags: {
    agentConfigurationAvailable: true,
    configurableIndicesAvailable: true,
    infrastructureTabAvailable: true,
    infraUiAvailable: true,
    migrationToFleetAvailable: true,
    sourcemapApiAvailable: true,
    storageExplorerAvailable: true,
    profilingIntegrationAvailable: false,
    ruleFormV2Enabled: false,
  },
  serverless: { enabled: false },
};

const mockUnifiedSearchBar = {
  ui: {
    SearchBar: () => <div />,
  },
};

const mockApmPluginContext = {
  appMountParameters: coreMock.createAppMountParameters('/basepath'),
  config: mockConfig,
  core: mockCore,
  plugins: mockPlugin,
  unifiedSearch: mockUnifiedSearchBar,
  observabilityAIAssistant: {
    service: { setScreenContext: () => noop },
  },
  share: sharePluginMock.createSetupContract(),
  uiActions: {
    getTriggerCompatibleActions: () => Promise.resolve([]),
  },
} as unknown as ApmPluginContextValue;

export function MockApmPluginStorybook({
  children,
  apmContext = {} as ApmPluginContextValue,
  routePath,
  serviceContextValue = {} as APMServiceContextValue,
}: {
  children?: ReactNode;
  routePath?: string;
  apmContext?: ApmPluginContextValue;
  serviceContextValue?: APMServiceContextValue;
}) {
  const contextMock = merge({}, mockApmPluginContext, apmContext);
  if (contextMock.core) {
    createCallApmApi(contextMock.core);
  }
  const KibanaReactContext = createKibanaReactContext(
    contextMock.core as unknown as Partial<CoreStart>
  );

  performance.mark = jest.fn();
  performance.clearMeasures = jest.fn();

  const history = createMemoryHistory({
    initialEntries: [routePath || '/services/?rangeFrom=now-15m&rangeTo=now'],
  });

  return (
    <IntlProvider locale="en">
      <EuiThemeProvider darkMode={false}>
        <KibanaReactContext.Provider>
          <ApmPluginContext.Provider value={contextMock}>
            <APMServiceContext.Provider value={serviceContextValue}>
              <RouterProvider router={apmRouter as any} history={history}>
                <MockTimeRangeContextProvider>
                  <ApmTimeRangeMetadataContextProvider>
                    {children}
                  </ApmTimeRangeMetadataContextProvider>
                </MockTimeRangeContextProvider>
              </RouterProvider>
            </APMServiceContext.Provider>
          </ApmPluginContext.Provider>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}
