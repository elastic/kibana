/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { Observable, of } from 'rxjs';
import { ApmPluginContext, ApmPluginContextValue } from './apm_plugin_context';
import { ConfigSchema } from '../..';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import { createCallApmApi } from '../../services/rest/createCallApmApi';
import { MlUrlGenerator } from '../../../../ml/public';
import { ApmRuleRegistry } from '../../plugin';

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

const mockApmRuleRegistry = ({
  getTypeByRuleId: () => undefined,
  registerType: () => undefined,
} as unknown) as ApmRuleRegistry;

const mockConfig: ConfigSchema = {
  serviceMapEnabled: true,
  ui: {
    enabled: false,
  },
  profilingEnabled: false,
};

const mockPlugin = {
  ml: {
    urlGenerator: new MlUrlGenerator({
      appBasePath: '/app/ml',
      useHash: false,
    }),
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
  apmRuleRegistry: mockApmRuleRegistry,
};

export function MockApmPluginContextWrapper({
  children,
  value = {} as ApmPluginContextValue,
}: {
  children?: React.ReactNode;
  value?: ApmPluginContextValue;
}) {
  if (value.core) {
    createCallApmApi(value.core);
  }
  return (
    <ApmPluginContext.Provider
      value={{
        ...mockApmPluginContextValue,
        ...value,
      }}
    >
      {children}
    </ApmPluginContext.Provider>
  );
}
