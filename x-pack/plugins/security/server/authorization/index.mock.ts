/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '.';
import { AuthorizationMode } from './mode';

export const authorizationMock = {
  create: ({
    version = 'mock-version',
    applicationName = 'mock-application',
  }: { version?: string; applicationName?: string } = {}) => ({
    actions: new Actions(version),
    checkPrivilegesWithRequest: jest.fn(),
    checkPrivilegesDynamicallyWithRequest: jest.fn(),
    checkSavedObjectsPrivilegesWithRequest: jest.fn(),
    applicationName,
    mode: { useRbacForRequest: jest.fn() } as jest.Mocked<AuthorizationMode>,
    privileges: { get: jest.fn() },
    registerPrivilegesWithCluster: jest.fn(),
    disableUnauthorizedCapabilities: jest.fn(),
  }),
};
