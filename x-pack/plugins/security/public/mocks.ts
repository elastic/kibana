/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authenticationMock } from './authentication/index.mock';
import { createSessionTimeoutMock } from './session/session_timeout.mock';
import { licenseMock } from '../common/licensing/index.mock';

function createSetupMock() {
  return {
    authc: authenticationMock.createSetup(),
    sessionTimeout: createSessionTimeoutMock(),
    license: licenseMock.create(),
  };
}

export const securityMock = {
  createSetup: createSetupMock,
};
