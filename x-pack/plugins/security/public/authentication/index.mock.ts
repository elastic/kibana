/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticationServiceSetup,
  AuthenticationServiceStart,
  AuthorizationServiceSetup,
  AuthorizationServiceStart,
} from '@kbn/security-plugin-types-public';

export const authenticationMock = {
  createSetup: (): jest.Mocked<AuthenticationServiceSetup> => ({
    getCurrentUser: jest.fn(),
    areAPIKeysEnabled: jest.fn(),
  }),
  createStart: (): jest.Mocked<AuthenticationServiceStart> => ({
    getCurrentUser: jest.fn(),
    areAPIKeysEnabled: jest.fn(),
  }),
};

export const authorizationMock = {
  createSetup: (): jest.Mocked<AuthorizationServiceSetup> => ({
    isRoleManagementEnabled: jest.fn(),
    roles: {
      getRoles: jest.fn(),
      getRole: jest.fn(),
      deleteRole: jest.fn(),
      saveRole: jest.fn(),
    },
  }),
  createStart: (): jest.Mocked<AuthorizationServiceStart> => ({
    isRoleManagementEnabled: jest.fn(),
    roles: {
      getRoles: jest.fn(),
      getRole: jest.fn(),
      deleteRole: jest.fn(),
      saveRole: jest.fn(),
    },
  }),
};
