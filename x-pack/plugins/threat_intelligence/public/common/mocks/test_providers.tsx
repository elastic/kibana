/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import React, { FC } from 'react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { IStorage } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { createTGridMocks } from '@kbn/timelines-plugin/public/mock';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { KibanaContext } from '../../hooks';
import { SecuritySolutionPluginContext } from '../../types';
import { getSecuritySolutionContextMock } from './mock_security_context';
import { mockUiSetting } from './mock_kibana_ui_settings_service';
import { SecuritySolutionContext } from '../../containers/security_solution_context';
import { IndicatorsFiltersContext } from '../../modules/indicators';
import { mockIndicatorsFiltersContext } from './mock_indicators_filters_context';
import { FieldTypesContext } from '../../containers/field_types_provider';
import { generateFieldTypeMap } from './mock_field_type_map';
import { InspectorContext } from '../../containers/inspector';

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
    search: jest.fn().mockReturnValue(new BehaviorSubject({})),
  },
};

const timelinesServiceMock = createTGridMocks();

const core = coreMock.createStart();
const coreServiceMock = {
  ...core,
  uiSettings: { get: jest.fn().mockImplementation(mockUiSetting) },
};

const mockSecurityContext: SecuritySolutionPluginContext = getSecuritySolutionContextMock();

export const mockedServices = {
  ...coreServiceMock,
  data: dataServiceMock,
  storage,
  unifiedSearch,
  triggersActionsUi: {
    getFieldBrowser: jest.fn().mockReturnValue(null),
  },
  timelines: timelinesServiceMock,
  securityLayout: {
    getPluginWrapper:
      () =>
      ({ children }: any) => {
        return <>{children}</>;
      },
  },
};

export const TestProvidersComponent: FC = ({ children }) => (
  <MemoryRouter>
    <InspectorContext.Provider value={{ requests: new RequestAdapter() }}>
      <QueryClientProvider client={new QueryClient()}>
        <FieldTypesContext.Provider value={generateFieldTypeMap()}>
          <EuiThemeProvider>
            <SecuritySolutionContext.Provider value={mockSecurityContext}>
              <KibanaContext.Provider value={{ services: mockedServices } as any}>
                <I18nProvider>
                  <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
                    {children}
                  </IndicatorsFiltersContext.Provider>
                </I18nProvider>
              </KibanaContext.Provider>
            </SecuritySolutionContext.Provider>
          </EuiThemeProvider>
        </FieldTypesContext.Provider>
      </QueryClientProvider>
    </InspectorContext.Provider>
  </MemoryRouter>
);

export type MockedSearch = jest.Mocked<typeof mockedServices.data.search>;
export type MockedTimefilter = jest.Mocked<typeof mockedServices.data.query.timefilter>;
export type MockedTriggersActionsUi = jest.Mocked<typeof mockedServices.triggersActionsUi>;
export type MockedQueryService = jest.Mocked<typeof mockedServices.data.query>;

export const mockedSearchService = mockedServices.data.search as MockedSearch;
export const mockedQueryService = mockedServices.data.query as MockedQueryService;
export const mockedTimefilterService = mockedServices.data.query.timefilter as MockedTimefilter;
export const mockedTriggersActionsUiService =
  mockedServices.triggersActionsUi as MockedTriggersActionsUi;
