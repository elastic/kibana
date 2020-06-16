/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authenticationMock } from './authentication/index.mock';
import { authorizationMock } from './authorization/index.mock';
import { licenseMock } from '../common/licensing/index.mock';
import { auditServiceMock } from './audit/index.mock';

function createSetupMock() {
  const mockAuthz = authorizationMock.create();
  return {
    audit: auditServiceMock.create(),
    authc: authenticationMock.create(),
    authz: {
      actions: mockAuthz.actions,
      checkPrivilegesWithRequest: mockAuthz.checkPrivilegesWithRequest,
      mode: mockAuthz.mode,
    },
    registerSpacesService: jest.fn(),
    license: licenseMock.create(),
  };
}

export const securityMock = {
  createSetup: createSetupMock,
};
