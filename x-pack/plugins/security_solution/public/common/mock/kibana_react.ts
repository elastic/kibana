/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

import {
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_INDEX_KEY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_DARK_MODE,
  DEFAULT_TIME_RANGE,
  DEFAULT_REFRESH_RATE_INTERVAL,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_BYTES_FORMAT,
  DEFAULT_INDEX_PATTERN,
} from '../../../common/constants';
import { createKibanaCoreStartMock, createKibanaPluginsStartMock } from './kibana_core';
import { StartServices } from '../../types';
import { createSecuritySolutionStorageMock } from './mock_local_storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockUiSettings: Record<string, any> = {
  [DEFAULT_TIME_RANGE]: { from: 'now-15m', to: 'now', mode: 'quick' },
  [DEFAULT_REFRESH_RATE_INTERVAL]: { pause: false, value: 0 },
  [DEFAULT_APP_TIME_RANGE]: {
    from: DEFAULT_FROM,
    to: DEFAULT_TO,
  },
  [DEFAULT_APP_REFRESH_INTERVAL]: {
    pause: DEFAULT_INTERVAL_PAUSE,
    value: DEFAULT_INTERVAL_VALUE,
  },
  [DEFAULT_INDEX_KEY]: DEFAULT_INDEX_PATTERN,
  [DEFAULT_BYTES_FORMAT]: '0,0.[0]b',
  [DEFAULT_DATE_FORMAT_TZ]: 'UTC',
  [DEFAULT_DATE_FORMAT]: 'MMM D, YYYY @ HH:mm:ss.SSS',
  [DEFAULT_DARK_MODE]: false,
};

export const createUseUiSettingMock = () => <T extends unknown = string>(
  key: string,
  defaultValue?: T
): T => {
  const result = mockUiSettings[key];

  if (typeof result != null) return result;

  if (defaultValue != null) {
    return defaultValue;
  }

  throw new Error(`Unexpected config key: ${key}`);
};

export const createUseUiSetting$Mock = () => {
  const useUiSettingMock = createUseUiSettingMock();

  return <T extends unknown = string>(
    key: string,
    defaultValue?: T
  ): [T, () => void] | undefined => [useUiSettingMock(key, defaultValue), jest.fn()];
};

export const createKibanaObservable$Mock = createKibanaCoreStartMock;

export const createUseKibanaMock = () => {
  const core = createKibanaCoreStartMock();
  const plugins = createKibanaPluginsStartMock();
  const useUiSetting = createUseUiSettingMock();
  const { storage } = createSecuritySolutionStorageMock();

  const services = {
    ...core,
    ...plugins,
    uiSettings: {
      ...core.uiSettings,
      get: useUiSetting,
    },
    storage,
  };

  return () => ({ services });
};

export const createStartServices = () => {
  const core = createKibanaCoreStartMock();
  const plugins = createKibanaPluginsStartMock();
  const security = {
    authc: {
      getCurrentUser: jest.fn(),
      areAPIKeysEnabled: jest.fn(),
    },
    sessionTimeout: {
      start: jest.fn(),
      stop: jest.fn(),
      extend: jest.fn(),
    },
    license: {
      isEnabled: jest.fn(),
      getFeatures: jest.fn(),
      features$: jest.fn(),
    },
    __legacyCompat: { logoutUrl: 'logoutUrl', tenant: 'tenant' },
  };

  const services = ({
    ...core,
    ...plugins,
    security,
  } as unknown) as StartServices;

  return services;
};

export const createWithKibanaMock = () => {
  const kibana = createUseKibanaMock()();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Component: any) => (props: any) => {
    return React.createElement(Component, { ...props, kibana });
  };
};

export const createKibanaContextProviderMock = () => {
  const kibana = createUseKibanaMock()();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ services, ...rest }: any) =>
    React.createElement(KibanaContextProvider, {
      ...rest,
      services: { ...kibana.services, ...services },
    });
};
