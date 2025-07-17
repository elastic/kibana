/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  DiscoverLogsLocatorParams,
  LogsLocatorParams,
  NodeLogsLocatorParams,
  TraceLogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public';
import {
  createObservabilityRuleTypeRegistryMock,
  enableComparisonByDefault,
} from '@kbn/observability-plugin/public';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { RouterProvider } from '@kbn/typed-react-router-config';
import type { History } from 'history';
import { createMemoryHistory } from 'history';
import { merge, noop } from 'lodash';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ConfigSchema } from '../..';
import { apmRouter } from '../../components/routing/apm_route_config';
import { createCallApmApi } from '../../services/rest/create_call_apm_api';
import type { ApmPluginContextValue } from './apm_plugin_context';
import { ApmPluginContext } from './apm_plugin_context';

const coreStart = coreMock.createStart({ basePath: '/basepath' });

const mockCore = merge({}, coreStart, {
  application: {
    capabilities: {
      apm: {},
      ml: {},
      savedObjectsManagement: { edit: true },
    },
  },
  uiSettings: {
    get: (key: string) => {
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
          {
            from: 'now-1m',
            to: 'now',
            display: 'Last 1 minute',
          },
          {
            from: 'now-15m',
            to: 'now',
            display: 'Last 15 minutes',
          },
          {
            from: 'now-30m',
            to: 'now',
            display: 'Last 30 minutes',
          },
          {
            from: 'now-1h',
            to: 'now',
            display: 'Last 1 hour',
          },
          {
            from: 'now-24h',
            to: 'now',
            display: 'Last 24 hours',
          },
          {
            from: 'now-7d',
            to: 'now',
            display: 'Last 7 days',
          },
          {
            from: 'now-30d',
            to: 'now',
            display: 'Last 30 days',
          },
          {
            from: 'now-90d',
            to: 'now',
            display: 'Last 90 days',
          },
          {
            from: 'now-1y',
            to: 'now',
            display: 'Last 1 year',
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
        [enableComparisonByDefault]: true,
      };
      return uiSettings[key];
    },
  },
  data: {
    query: {
      queryString: { getQuery: jest.fn(), setQuery: jest.fn(), clearQuery: jest.fn() },
      timefilter: {
        timefilter: {
          setTime: jest.fn(),
          setRefreshInterval: jest.fn(),
          getTime: jest.fn(),
        },
      },
    },
  },
  observabilityShared: {
    navigation: {
      PageTemplate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  },
});

const mockConfig: ConfigSchema = {
  serviceMapEnabled: true,
  ui: {
    enabled: false,
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
    // to be removed in https://github.com/elastic/kibana/issues/221904
    profilingIntegrationAvailable: false,
    ruleFormV2Enabled: false,
  },
  serverless: { enabled: false },
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
  observabilityShared: {
    locators: {
      profiling: {
        flamegraphLocator: {
          getRedirectUrl: () => '/profiling/flamegraphs/flamegraph',
        },
        topNFunctionsLocator: {
          getRedirectUrl: () => '/profiling/functions/topn',
        },
        stacktracesLocator: {
          getRedirectUrl: () => '/profiling/stacktraces/threads',
        },
      },
    },
  },
};

export const observabilityLogsExplorerLocatorsMock = {
  allDatasetsLocator: sharePluginMock.createLocator(),
  singleDatasetLocator: sharePluginMock.createLocator(),
};

export const logsLocatorsMock = {
  discoverLogsLocator: sharePluginMock.createLocator<DiscoverLogsLocatorParams>(),
  logsLocator: sharePluginMock.createLocator<LogsLocatorParams>(),
  nodeLogsLocator: sharePluginMock.createLocator<NodeLogsLocatorParams>(),
  traceLogsLocator: sharePluginMock.createLocator<TraceLogsLocatorParams>(),
};

const mockCorePlugins = {
  embeddable: {},
  inspector: {},
  maps: {},
  observability: {},
  observabilityShared: {},
  data: {},
};

const mockUnifiedSearch = {
  ui: {
    SearchBar: () => <div className="searchBar" />,
  },
};

export const mockApmPluginContextValue = {
  appMountParameters: coreMock.createAppMountParameters('/basepath'),
  config: mockConfig,
  core: mockCore,
  plugins: mockPlugin,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  corePlugins: mockCorePlugins,
  deps: {},
  share: sharePluginMock.createSetupContract(),
  unifiedSearch: mockUnifiedSearch,
  uiActions: {
    getTriggerCompatibleActions: () => Promise.resolve([]),
  },
  observabilityAIAssistant: {
    service: { setScreenContext: jest.fn().mockImplementation(() => noop) },
  },
};

export function MockApmPluginContextWrapper({
  children,
  value = {} as ApmPluginContextValue,
  history,
}: {
  children?: ReactNode;
  value?: ApmPluginContextValue;
  history?: History;
}) {
  const contextValue = merge({}, mockApmPluginContextValue, value);

  if (contextValue.core) {
    createCallApmApi(contextValue.core);
  }

  performance.mark = jest.fn();
  performance.clearMeasures = jest.fn();

  const contextHistory = useHistory();

  const usedHistory = useMemo(() => {
    return (
      history ||
      contextHistory ||
      createMemoryHistory({
        initialEntries: ['/services/?rangeFrom=now-15m&rangeTo=now'],
      })
    );
  }, [history, contextHistory]);

  return (
    <IntlProvider locale="en">
      <KibanaContextProvider services={contextValue.core}>
        <ApmPluginContext.Provider value={contextValue}>
          <RouterProvider router={apmRouter as any} history={usedHistory}>
            {children}
          </RouterProvider>
        </ApmPluginContext.Provider>
      </KibanaContextProvider>
    </IntlProvider>
  );
}
