/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '../common/licensing/index.mock';
import type { MockAuthenticatedUserProps } from '../common/model/authenticated_user.mock';
import { mockAuthenticatedUser } from '../common/model/authenticated_user.mock';
import { authenticationMock } from './authentication/index.mock';
import { navControlServiceMock } from './nav_control/index.mock';
import { createSessionTimeoutMock } from './session/session_timeout.mock';

function createSetupMock() {
  return {
    authc: authenticationMock.createSetup(),
    sessionTimeout: createSessionTimeoutMock(),
    license: licenseMock.create(),
  };
}
function createStartMock() {
  return {
    authc: authenticationMock.createStart(),
    navControlService: navControlServiceMock.createStart(),
  };
}

export const securityMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  createMockAuthenticatedUser: (props: MockAuthenticatedUserProps = {}) =>
    mockAuthenticatedUser(props),
};
