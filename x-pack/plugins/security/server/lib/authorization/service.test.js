/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAuthorizationService } from './service';
import { actionsFactory } from './actions';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { authorizationModeFactory } from './mode';

jest.mock('./check_privileges', () => ({
  checkPrivilegesWithRequestFactory: jest.fn(),
}));

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));

jest.mock('./actions', () => ({
  actionsFactory: jest.fn(),
}));

jest.mock('./mode', () => ({
  authorizationModeFactory: jest.fn(),
}));

const createMockConfig = (settings = {}) => {
  const mockConfig = {
    get: jest.fn()
  };

  mockConfig.get.mockImplementation(key => settings[key]);

  return mockConfig;
};

test(`calls server.expose with exposed services`, () => {
  const kibanaIndex = '.a-kibana-index';
  const mockConfig = createMockConfig({
    'kibana.index': kibanaIndex
  });
  const mockServer = {
    expose: jest.fn(),
    config: jest.fn().mockReturnValue(mockConfig),
    plugins: Symbol(),
    savedObjects: Symbol(),
    log: Symbol(),
  };
  const mockShieldClient = Symbol();
  getClient.mockReturnValue(mockShieldClient);
  const mockCheckPrivilegesWithRequest = Symbol();
  checkPrivilegesWithRequestFactory.mockReturnValue(mockCheckPrivilegesWithRequest);
  const mockActions = Symbol();
  actionsFactory.mockReturnValue(mockActions);
  mockConfig.get.mock;
  const mockXpackInfoFeature = Symbol();

  createAuthorizationService(mockServer, mockXpackInfoFeature);

  const application = `kibana-${kibanaIndex}`;
  expect(getClient).toHaveBeenCalledWith(mockServer);
  expect(actionsFactory).toHaveBeenCalledWith(mockConfig);
  expect(checkPrivilegesWithRequestFactory).toHaveBeenCalledWith(mockActions, application, mockShieldClient);
  expect(authorizationModeFactory).toHaveBeenCalledWith(
    application,
    mockConfig,
    expect.any(Function),
    mockShieldClient,
    mockXpackInfoFeature,
  );
});
