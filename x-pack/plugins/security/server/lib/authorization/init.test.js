/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initAuthorization } from './init';
import { checkPrivilegesWithRequestFactory } from './check_privileges';

jest.mock('./check_privileges', () => ({
  checkPrivilegesWithRequestFactory: jest.fn(),
}));

test(`calls server.expose with exposed services`, () => {
  const mockServer = {
    expose: jest.fn(),
  };
  const checkPrivilegesWithRequest = Symbol();
  checkPrivilegesWithRequestFactory.mockReturnValue(checkPrivilegesWithRequest);

  initAuthorization(mockServer);

  expect(mockServer.expose).toHaveBeenCalledWith('authorization', {
    checkPrivilegesWithRequest
  });
});
