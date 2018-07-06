/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initAuthorizationService } from './init';
import { actionsFactory } from './actions';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';

jest.mock('./check_privileges', () => ({
  checkPrivilegesWithRequestFactory: jest.fn(),
}));

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));

jest.mock('./actions', () => ({
  actionsFactory: jest.fn(),
}));

test(`calls server.expose with exposed services`, () => {
  const mockConfig = Symbol();
  const mockServer = {
    expose: jest.fn(),
    config: jest.fn().mockReturnValue(mockConfig)
  };
  const mockShieldClient = Symbol();
  getClient.mockReturnValue(mockShieldClient);
  const mockCheckPrivilegesWithRequest = Symbol();
  checkPrivilegesWithRequestFactory.mockReturnValue(mockCheckPrivilegesWithRequest);
  const mockActions = Symbol();
  actionsFactory.mockReturnValue(mockActions);

  initAuthorizationService(mockServer);

  expect(getClient).toHaveBeenCalledWith(mockServer);
  expect(actionsFactory).toHaveBeenCalledWith(mockConfig);
  expect(checkPrivilegesWithRequestFactory).toHaveBeenCalledWith(mockShieldClient, mockConfig, mockActions);
  expect(mockServer.expose).toHaveBeenCalledWith('authorization', {
    checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
    actions: mockActions,
  });
});

test(`deep freezes exposed service`, () => {
  const mockConfig = Symbol();
  const mockServer = {
    expose: jest.fn(),
    config: jest.fn().mockReturnValue(mockConfig)
  };
  actionsFactory.mockReturnValue({
    login: 'login',
  });

  initAuthorizationService(mockServer);

  const exposed = mockServer.expose.mock.calls[0][1];
  expect(() => delete exposed.checkPrivilegesWithRequest).toThrowErrorMatchingSnapshot();
  expect(() => exposed.foo = 'bar').toThrowErrorMatchingSnapshot();
  expect(() => exposed.actions.login = 'not-login').toThrowErrorMatchingSnapshot();
});
