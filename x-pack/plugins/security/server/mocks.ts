/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityPluginSetup } from './plugin';

import { authenticationMock } from './authentication/index.mock';
import { authorizationMock } from './authorization/index.mock';
import { licenseMock } from '../common/licensing/index.mock';

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
    license: licenseMock.create(),
    __legacyCompat: {} as SecurityPluginSetup['__legacyCompat'],
  };
}

export const securityMock = {
  createSetup: createSetupMock,
};
