/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CurrentRouteContextProvider,
  RouteMatch,
  RouterProvider,
} from '@kbn/typed-react-router-config';
import type { DecoratorFn } from '@storybook/react';
import { createMemoryHistory, History } from 'history';
import { merge } from 'lodash';
import React, { createContext, ReactNode, useMemo } from 'react';
import { Observable } from 'rxjs';
import type { ConfigSchema } from '../..';
import type { CoreStart } from '../../../../../../src/core/public';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { createKibanaReactContext } from '../../../../../../src/plugins/kibana_react/public';
import { UrlService } from '../../../../../../src/plugins/share/common/url_service';
import { MlLocatorDefinition } from '../../../../ml/public';
import {
  createObservabilityRuleTypeRegistryMock,
  enableComparisonByDefault,
} from '../../../../observability/public';
import type { RecursivePartial } from '../../../typings/common';
import { apmRouter } from '../../components/routing/apm_route_config';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';
import { createCallApmApi } from '../../services/rest/createCallApmApi';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../apm_plugin/apm_plugin_context';

// Kibana context

const mockCoreStart = {
  application: {
    capabilities: {
      apm: { save: true },
      dashboard: { show: true },
      ml: {},
    },
    currentAppId$: new Observable(),
    getUrlForApp: () => {},
  },
  chrome: {
    docTitle: { change: () => {} },
    setBadge: () => {},
    setHelpExtension: () => {},
  },
  docLinks: { links: { apm: {}, observability: {} } },
  http: {
    basePath: { get: () => '', prepend: (str: string) => `/basepath${str}` },
    get: () => ({}),
  },
  i18n: { Context: ({ children }: { children: ReactNode }) => <>{children}</> },
  notifications: { toasts: { add: () => {}, addDanger: () => {} } },
  uiSettings: {
    get: (key: string) => {
      const uiSettings: Record<string, unknown> = {
        [enableComparisonByDefault]: true,
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
      };
      return uiSettings[key];
    },
    get$: () => new Observable(),
  },
};

// APM Plugin context

const urlService = new UrlService({
  navigate: async () => {},
  getUrl: async ({ app, path }, { absolute }) => {
    return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
  },
  shortUrls: () => ({ get: () => {} } as any),
});
const locator = urlService.locators.create(new MlLocatorDefinition());

const mockPluginsStart = {
  embeddable: {},
  inspector: {},
  maps: {},
  observability: { navigation: { PageTemplate: () => null } },
  data: {},
};

const mockPluginsSetup = {
  data: {
    query: {
      timefilter: { timefilter: { setTime: () => {}, getTime: () => ({}) } },
    },
  },
  licensing: { license$: new Observable() },
  ml: {
    locator,
  },
  observability: {
    isAlertingExperienceEnabled: () => false,
    navigation: { PageTemplate: () => null },
    observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  },
  usageCollection: { reportUiCounter: () => {} },
};

const mockApmPluginContextValue = {
  pluginsSetup: mockPluginsSetup,
  pluginsStart: mockPluginsStart,
} as unknown as ApmPluginContextValue;

// Mock APM app context

export interface MockContextValue {
  config: ConfigSchema;
  coreStart: CoreStart;
  history?: History;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;

  /**
   * The router path as a string or location
   */
  path?: History.LocationDescriptor<any>;
}

export const mockContextValue = {
  coreStart: mockCoreStart,
  ...mockApmPluginContextValue,
} as unknown as MockContextValue;

export const MockContext = createContext<MockContextValue>(mockContextValue);

/**
 * A mock provider for APM contexts which includes mocks for:
 *
 * - ApmPluginContext
 * - Router
 * - KibanaContext
 *
 * Provided values are deep-merged with mocked defaults.
 */
export function MockContextProvider({
  children,
  value = {},
}: {
  children?: ReactNode;
  value?: RecursivePartial<MockContextValue>;
}) {
  const { history, path, pluginsSetup, pluginsStart } = value;
  const usedHistory = useMemo(() => {
    return (
      history ??
      createMemoryHistory({
        initialEntries: [
          (path as string) ?? '/services/?rangeFrom=now-15m&rangeTo=now',
        ],
      })
    );
  }, [history, path]);
  const coreStart = merge(
    {},
    mockCoreStart,
    value.coreStart
  ) as unknown as CoreStart;
  const KibanaContext = createKibanaReactContext({
    ...coreStart,
    usageCollection: { reportUiCounter: () => {} },
  });

  createCallApmApi(coreStart);

  return (
    <KibanaContext.Provider>
      <ApmPluginContext.Provider
        value={merge({}, mockApmPluginContextValue, {
          pluginsSetup,
          pluginsStart,
        })}
      >
        <RouterProvider router={apmRouter as any} history={usedHistory}>
          <CurrentRouteContextProvider
            element={<div />}
            match={{} as RouteMatch}
          >
            <>{children}</>
          </CurrentRouteContextProvider>
        </RouterProvider>
      </ApmPluginContext.Provider>
    </KibanaContext.Provider>
  );
}

/* eslint-disable react/function-component-definition */

/**
 * Storybook decorator for mock context
 */
export const MockContextDecorator: DecoratorFn = (storyFn, { args }) => {
  return <MockContextProvider value={args}>{storyFn()}</MockContextProvider>;
};
