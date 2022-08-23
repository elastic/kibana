/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import React, { FC } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { IStorage } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { mockUiSetting } from './mock_kibana_ui_setting';
import { KibanaContextProvider } from '../../hooks/use_kibana';
import { Services, ThreatIntelligenceSecuritySolutionContext } from '../../types';
import { SecuritySolutionContext } from '../../containers/security_solution_context';

export const localStorageMock = (): IStorage => {
  let store: Record<string, unknown> = {};

  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: unknown) => {
      store[key] = value;
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
};

export const createTiStorageMock = () => {
  const localStorage = localStorageMock();
  return {
    localStorage,
    storage: new Storage(localStorage),
  };
};

const { storage } = createTiStorageMock();

export const unifiedSearch = unifiedSearchPluginMock.createStartContract();

const validDate: string = '1 Jan 2022 00:00:00 GMT';
const data = dataPluginMock.createStartContract();
const dataServiceMock = {
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
    timefilter: {
      timefilter: {
        calculateBounds: jest.fn().mockImplementation(() => ({
          min: moment(validDate),
          max: moment(validDate).add(1, 'days'),
        })),
      },
    },
  },
  search: {
    ...data.search,
    search: jest.fn().mockImplementation(() => ({
      subscribe: jest.fn().mockImplementation(() => ({
        error: jest.fn(),
        next: jest.fn(),
        unsubscribe: jest.fn(),
      })),
      pipe: jest.fn().mockImplementation(() => ({
        subscribe: jest.fn().mockImplementation(() => ({
          error: jest.fn(),
          next: jest.fn(),
          unsubscribe: jest.fn(),
        })),
      })),
    })),
  },
};

const core = coreMock.createStart();
const coreServiceMock = {
  ...core,
  uiSettings: { get: jest.fn().mockImplementation(mockUiSetting) },
};

const mockSecurityContext: ThreatIntelligenceSecuritySolutionContext = {
  getFiltersGlobalComponent:
    () =>
    ({ children }) =>
      <div>{children}</div>,
  licenseService: {
    isEnterprise() {
      return true;
    },
  },
};

const mockedServices = {
  ...coreServiceMock,
  data: dataServiceMock,
  storage,
  unifiedSearch,
} as unknown as Services;

export const TestProvidersComponent: FC = ({ children }) => (
  <SecuritySolutionContext.Provider value={mockSecurityContext}>
    <KibanaContextProvider services={mockedServices}>
      <I18nProvider>{children}</I18nProvider>
    </KibanaContextProvider>
  </SecuritySolutionContext.Provider>
);
