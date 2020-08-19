/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { notificationServiceMock } from '../../../../../../../../src/core/public/mocks';
import {
  createKibanaContextProviderMock,
  createUseUiSettingMock,
  createUseUiSetting$Mock,
  createStartServicesMock,
  createWithKibanaMock,
} from '../kibana_react.mock';

export const KibanaServices = { get: jest.fn(), getKibanaVersion: jest.fn(() => '8.0.0') };
export const useKibana = jest.fn().mockReturnValue({ services: createStartServicesMock() });
export const useUiSetting = jest.fn(createUseUiSettingMock());
export const useUiSetting$ = jest.fn(createUseUiSetting$Mock());
export const useHttp = jest.fn().mockReturnValue(createStartServicesMock().http);
export const useTimeZone = jest.fn();
export const useDateFormat = jest.fn();
export const useBasePath = jest.fn(() => '/test/base/path');
export const useToasts = jest
  .fn()
  .mockReturnValue(notificationServiceMock.createStartContract().toasts);
export const useCurrentUser = jest.fn();
export const withKibana = jest.fn(createWithKibanaMock());
export const KibanaContextProvider = jest.fn(createKibanaContextProviderMock());
export const useGetUserSavedObjectPermissions = jest.fn();
