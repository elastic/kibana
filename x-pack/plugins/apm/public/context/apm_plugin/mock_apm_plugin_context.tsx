/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useMemo } from 'react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { useHistory } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { merge } from 'lodash';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { UrlService } from '../../../../../../src/plugins/share/common/url_service';
import { createObservabilityRuleTypeRegistryMock } from '../../../../observability/public';
import { ApmPluginContext, ApmPluginContextValue } from './apm_plugin_context';
import { ConfigSchema } from '../..';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { createCallApmApi } from '../../services/rest/create_call_apm_api';
import { apmRouter } from '../../components/routing/apm_route_config';
import { MlLocatorDefinition } from '../../../../ml/public';
import { enableComparisonByDefault } from '../../../../observability/public';

const coreStart = coreMock.createStart({ basePath: '/basepath' });

const mockCore = merge({}, coreStart, {
  application: {
    capabilities: {
      apm: {},
      ml: {},
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
});

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
  observability: {
    isAlertingExperienceEnabled: () => false,
  },
};

const mockCorePlugins = {
  embeddable: {},
  inspector: {},
  maps: {},
  observability: {},
  data: {},
};

export const mockApmPluginContextValue = {
  appMountParameters: coreMock.createAppMountParameters('/basepath'),
  config: mockConfig,
  core: mockCore,
  plugins: mockPlugin,
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  corePlugins: mockCorePlugins,
  deps: {},
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
