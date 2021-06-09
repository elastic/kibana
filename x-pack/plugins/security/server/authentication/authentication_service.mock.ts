/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

import { apiKeysMock } from './api_keys/api_keys.mock';
import type { AuthenticationServiceStartInternal } from './authentication_service';

export const authenticationServiceMock = {
  createStart: (): DeeplyMockedKeys<AuthenticationServiceStartInternal> => ({
    apiKeys: apiKeysMock.create(),
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    acknowledgeAccessAgreement: jest.fn(),
  }),
};
