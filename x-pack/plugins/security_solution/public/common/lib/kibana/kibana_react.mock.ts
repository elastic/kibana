/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';

import { coreMock } from '../../../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { securityMock } from '../../../../../../plugins/security/public/mocks';
import {
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_BYTES_FORMAT,
  DEFAULT_DARK_MODE,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_FROM,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_REFRESH_RATE_INTERVAL,
  DEFAULT_TIME_RANGE,
  DEFAULT_TO,
} from '../../../../common/constants';
import { StartServices } from '../../../types';
import { createSecuritySolutionStorageMock } from '../../mock/mock_local_storage';
import { MlUrlGenerator } from '../../../../../ml/public';

const mockUiSettings: Record<string, unknown> = {
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

export const createUseUiSettingMock = () => (key: string, defaultValue?: unknown): unknown => {
  const result = mockUiSettings[key];

  if (typeof result != null) return result;

  if (defaultValue != null) {
    return defaultValue;
  }

  throw new TypeError(`Unexpected config key: ${key}`);
};

export const createUseUiSetting$Mock = () => {
  const useUiSettingMock = createUseUiSettingMock();

  return (key: string, defaultValue?: unknown): [unknown, () => void] | undefined => [
    useUiSettingMock(key, defaultValue),
    jest.fn(),
  ];
};

export const createStartServicesMock = (): StartServices => {
  const core = coreMock.createStart();
  core.uiSettings.get.mockImplementation(createUseUiSettingMock());
  const { storage } = createSecuritySolutionStorageMock();
  const data = dataPluginMock.createStartContract();
  const security = securityMock.createSetup();

  return ({
    ...core,
    data: {
      ...data,
      query: {
        ...data.query,
        savedQueries: {
          ...data.query.savedQueries,
          getAllSavedQueries: jest.fn(() =>
            Promise.resolve({
              id: '123',
              attributes: {
                total: 123,
              },
            })
          ),
          findSavedQueries: jest.fn(() =>
            Promise.resolve({
              total: 123,
              queries: [],
            })
          ),
        },
      },
      search: {
        ...data.search,
        search: jest.fn().mockImplementation(() => ({
          subscribe: jest.fn().mockImplementation(() => ({
            error: jest.fn(),
            next: jest.fn(),
          })),
        })),
      },
    },
    security,
    storage,
    ml: {
      urlGenerator: new MlUrlGenerator({
        appBasePath: '/app/ml',
        useHash: false,
      }),
    },
  } as unknown) as StartServices;
};

export const createWithKibanaMock = () => {
  const services = createStartServicesMock();

  return (Component: unknown) => (props: unknown) => {
    return React.createElement(Component as string, { ...(props as object), kibana: { services } });
  };
};

export const createKibanaContextProviderMock = () => {
  const services = createStartServicesMock();

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(KibanaContextProvider, { services }, children);
};
