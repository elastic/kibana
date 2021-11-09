/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouterProvider } from '@kbn/typed-react-router-config';
import { createMemoryHistory } from 'history';
import { merge } from 'lodash';
import React, { createContext, ReactNode } from 'react';
import type { CoreStart } from '../../../../../../src/core/public';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';
import type { ConfigSchema } from '../..';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';
import { apmRouter } from '../../components/routing/apm_route_config';
import { createKibanaReactContext } from '../../../../../../src/plugins/kibana_react/public';

// Kibana context

const mockCoreStart = merge(
  {},
  coreMock.createStart({ basePath: '/basepath' }),
  {
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
  }
);

const KibanaContext = createKibanaReactContext(mockCoreStart);

// Mock APM app context

export interface MockApmAppContextValue {
  config: ConfigSchema;
  coreStart: CoreStart;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;
}

export const mockApmAppContextValue = {
  coreStart: mockCoreStart,
} as unknown as MockApmAppContextValue;

export const MockApmAppContext = createContext<MockApmAppContextValue>(
  mockApmAppContextValue
);

/**
 * A mock provider for APM contexts which includes mocks for:
 *
 * - ApmPluginContext
 * - KibanaConfigContext
 * - KibanaContext
 *
 * Provided values are deep-merged with mocked defaults.
 */
export function MockApmAppContextProvider({
  children,
  value = {},
}: {
  children: ReactNode;
  value?: Partial<MockApmAppContextValue>;
}) {
  const history = createMemoryHistory({
    initialEntries: ['/services/?rangeFrom=now-15m&rangeTo=now'],
  });
  const coreStart = merge({}, mockCoreStart, value.coreStart);

  return (
    <KibanaContext.Provider {...coreStart}>
      <RouterProvider router={apmRouter as any} history={history}>
        {children}
      </RouterProvider>
    </KibanaContext.Provider>
  );
}
