/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockCheckPrivilegesWithRequestFactory = jest.fn();
jest.mock('./check_privileges', () => ({
  checkPrivilegesWithRequestFactory: mockCheckPrivilegesWithRequestFactory,
}));

export const mockCheckPrivilegesDynamicallyWithRequestFactory = jest.fn();
jest.mock('./check_privileges_dynamically', () => ({
  checkPrivilegesDynamicallyWithRequestFactory: mockCheckPrivilegesDynamicallyWithRequestFactory,
}));

export const mockGetClient = jest.fn();
jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: mockGetClient,
}));

export const mockActionsFactory = jest.fn();
jest.mock('./actions', () => ({
  actionsFactory: mockActionsFactory,
}));

export const mockPrivilegesFactory = jest.fn();
jest.mock('./privileges', () => ({
  privilegesFactory: mockPrivilegesFactory,
}));

export const mockAuthorizationModeFactory = jest.fn();
jest.mock('./mode', () => ({
  authorizationModeFactory: mockAuthorizationModeFactory,
}));
