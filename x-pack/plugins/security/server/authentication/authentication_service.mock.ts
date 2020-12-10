/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import type {
  AuthenticationServiceSetup,
  AuthenticationServiceStart,
} from './authentication_service';

import { apiKeysMock } from './api_keys/api_keys.mock';

export const authenticationServiceMock = {
  createSetup: (): jest.Mocked<AuthenticationServiceSetup> => ({
    getCurrentUser: jest.fn(),
  }),
  createStart: (): DeeplyMockedKeys<AuthenticationServiceStart> => ({
    apiKeys: apiKeysMock.create(),
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    acknowledgeAccessAgreement: jest.fn(),
  }),
};
