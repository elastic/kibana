/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Authentication } from '.';

export const authenticationMock = {
  create: (): jest.Mocked<Authentication> => ({
    login: jest.fn(),
    logout: jest.fn(),
    isProviderTypeEnabled: jest.fn(),
    areAPIKeysEnabled: jest.fn(),
    createAPIKey: jest.fn(),
    getCurrentUser: jest.fn(),
    grantAPIKeyAsInternalUser: jest.fn(),
    invalidateAPIKey: jest.fn(),
    invalidateAPIKeyAsInternalUser: jest.fn(),
    isAuthenticated: jest.fn(),
    acknowledgeAccessAgreement: jest.fn(),
  }),
};
