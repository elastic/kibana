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
import { coreMock } from '../../../../../src/core/public/mocks';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { uxRouter } from '../application/ux_app';

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
      };
      return uiSettings[key];
    },
  },
});

const mockPlugin = {
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

export const mockPluginContextValue = {
  appMountParameters: coreMock.createAppMountParameters('/basepath'),
  core: mockCore,
  plugins: mockPlugin,
  corePlugins: mockCorePlugins,
  deps: {},
};

export function MockKibanaContextWrapper({
  children,
  history,
}: {
  children?: ReactNode;
  history?: History;
}) {
  createCallApmApi(mockCore);

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
    <KibanaContextProvider services={mockPluginContextValue}>
      <RouterProvider router={uxRouter as any} history={usedHistory}>
        {children}
      </RouterProvider>
    </KibanaContextProvider>
  );
}
