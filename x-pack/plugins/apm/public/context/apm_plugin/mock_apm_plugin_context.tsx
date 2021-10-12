/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo } from 'react';
import { Observable, of } from 'rxjs';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { useHistory } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { merge } from 'lodash';
import { UrlService } from '../../../../../../src/plugins/share/common/url_service';
import { createObservabilityRuleTypeRegistryMock } from '../../../../observability/public';
import { ApmPluginContext, ApmPluginContextValue } from './apm_plugin_context';
import { ConfigSchema } from '../..';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { createCallApmApi } from '../../services/rest/createCallApmApi';
import { apmRouter } from '../../components/routing/apm_route_config';
import { MlLocatorDefinition } from '../../../../ml/public';

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
};

const mockCore = {
  application: {
    capabilities: {
      apm: {},
      ml: {},
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
    },
  },
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`,
      get: () => `/basepath`,
    },
  },
  i18n: {
    Context: ({ children }: { children: ReactNode }) => children,
  },
  notifications: {
    toasts: {
      addWarning: () => {},
      addDanger: () => {},
    },
  },
  uiSettings: {
    get: (key: string) => uiSettings[key],
    get$: (key: string) => of(mockCore.uiSettings.get(key)),
  },
};

const mockConfig: ConfigSchema = {
  serviceMapEnabled: true,
  ui: {
    enabled: false,
  },
  profilingEnabled: false,
};

const urlService = new UrlService({
  navigate: async () => {},
  getUrl: async ({ app, path }, { absolute }) => {
    return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
  },
  shortUrls: {} as any,
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
  observability: {
    isAlertingExperienceEnabled: () => false,
  },
};

const mockAppMountParameters = {
  setHeaderActionMenu: () => {},
};

export const mockApmPluginContextValue = {
  appMountParameters: mockAppMountParameters,
  config: mockConfig,
  core: mockCore,
  plugins: mockPlugin,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
};

export function MockApmPluginContextWrapper({
  children,
  value = {} as ApmPluginContextValue,
  history,
}: {
  children?: React.ReactNode;
  value?: ApmPluginContextValue;
  history?: History;
}) {
  const contextValue = merge({}, mockApmPluginContextValue, value);

  if (contextValue.core) {
    createCallApmApi(contextValue.core);
  }

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
    <ApmPluginContext.Provider value={contextValue}>
      <RouterProvider router={apmRouter as any} history={usedHistory}>
        {children}
      </RouterProvider>
    </ApmPluginContext.Provider>
  );
}
