/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract } from './plugin';

import { authenticationMock } from './authentication/index.mock';
import { authorizationMock } from './authorization/index.mock';

function createSetupMock() {
  const mockAuthz = authorizationMock.create();
  return {
    authc: authenticationMock.create(),
    authz: {
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      mode: mockAuthz.mode,
    },
    registerSpacesService: jest.fn(),
    __legacyCompat: {} as PluginSetupContract['__legacyCompat'],
  };
}

export const securityMock = {
  createSetup: createSetupMock,
};
