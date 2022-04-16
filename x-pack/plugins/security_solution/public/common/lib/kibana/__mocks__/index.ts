/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notificationServiceMock } from '@kbn/core/public/mocks';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createTGridMocks } from '@kbn/timelines-plugin/public/mock';

import {
  createKibanaContextProviderMock,
  createUseUiSettingMock,
  createUseUiSetting$Mock,
  createStartServicesMock,
  createWithKibanaMock,
} from '../kibana_react.mock';
import { APP_UI_ID } from '../../../../../common/constants';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

const mockStartServicesMock = createStartServicesMock();
export const KibanaServices = { get: jest.fn(), getKibanaVersion: jest.fn(() => '8.0.0') };
export const useKibana = jest.fn().mockReturnValue({
  services: {
    ...mockStartServicesMock,
    uiSettings: {
      get: jest.fn(),
      set: jest.fn(),
    },
    cases: mockCasesContract(),
    data: {
      ...mockStartServicesMock.data,
      search: {
        ...mockStartServicesMock.data.search,
        search: jest.fn().mockImplementation(() => ({
          subscribe: jest.fn().mockImplementation(() => ({
            error: jest.fn(),
            next: jest.fn(),
            unsubscribe: jest.fn(),
          })),
        })),
      },
      query: {
        ...mockStartServicesMock.data.query,
        filterManager: {
          addFilters: jest.fn(),
          getFilters: jest.fn(),
          getUpdates$: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
          setAppFilters: jest.fn(),
        },
      },
    },
    timelines: createTGridMocks(),
  },
});
export const useUiSetting = jest.fn(createUseUiSettingMock());
export const useUiSetting$ = jest.fn(createUseUiSetting$Mock());
export const useHttp = jest.fn().mockReturnValue(createStartServicesMock().http);
export const useTimeZone = jest.fn();
export const useDateFormat = jest.fn().mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
export const useBasePath = jest.fn(() => '/test/base/path');
export const useToasts = jest
  .fn()
  .mockReturnValue(notificationServiceMock.createStartContract().toasts);
export const useCurrentUser = jest.fn();
export const withKibana = jest.fn(createWithKibanaMock());
export const KibanaContextProvider = jest.fn(createKibanaContextProviderMock());
export const useGetUserCasesPermissions = jest.fn();
export const useAppUrl = jest.fn().mockReturnValue({
  getAppUrl: jest
    .fn()
    .mockImplementation(({ appId = APP_UI_ID, ...options }) =>
      mockStartServicesMock.application.getUrlForApp(appId, options)
    ),
});
