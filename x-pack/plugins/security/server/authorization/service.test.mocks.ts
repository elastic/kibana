/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockCheckPrivilegesFactory = jest.fn();
jest.mock('./check_privileges', () => ({
  checkPrivilegesFactory: mockCheckPrivilegesFactory,
}));

export const mockCheckPrivilegesDynamicallyWithRequestFactory = jest.fn();
jest.mock('./check_privileges_dynamically', () => ({
  checkPrivilegesDynamicallyWithRequestFactory: mockCheckPrivilegesDynamicallyWithRequestFactory,
}));

export const mockCheckSavedObjectsPrivilegesWithRequestFactory = jest.fn();
jest.mock('./check_saved_objects_privileges', () => ({
  checkSavedObjectsPrivilegesWithRequestFactory: mockCheckSavedObjectsPrivilegesWithRequestFactory,
}));

export const mockPrivilegesFactory = jest.fn();
jest.mock('./privileges', () => ({
  privilegesFactory: mockPrivilegesFactory,
}));

export const mockAuthorizationModeFactory = jest.fn();
jest.mock('./mode', () => ({
  authorizationModeFactory: mockAuthorizationModeFactory,
}));

export const mockRegisterPrivilegesWithCluster = jest.fn();
jest.mock('./register_privileges_with_cluster', () => ({
  registerPrivilegesWithCluster: mockRegisterPrivilegesWithCluster,
}));
