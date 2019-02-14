/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getClient } from '../../../../../server/lib/get_client_shield';
import { actionsFactory } from './actions';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { authorizationModeFactory } from './mode';
import { privilegesFactory } from './privileges';
import { createAuthorizationService } from './service';

jest.mock('./check_privileges', () => ({
  checkPrivilegesWithRequestFactory: jest.fn(),
}));

jest.mock('./check_privileges_dynamically', () => ({
  checkPrivilegesDynamicallyWithRequestFactory: jest.fn(),
}));

jest.mock('../../../../../server/lib/get_client_shield', () => ({
  getClient: jest.fn(),
}));

jest.mock('./actions', () => ({
  actionsFactory: jest.fn(),
}));

jest.mock('./privileges', () => ({
  privilegesFactory: jest.fn(),
}));

jest.mock('./mode', () => ({
  authorizationModeFactory: jest.fn(),
}));

const createMockConfig = (settings: Record<string, any> = {}) => {
  const mockConfig = {
    get: jest.fn(),
  };

  mockConfig.get.mockImplementation((key: string) => settings[key]);

  return mockConfig;
};

test(`returns exposed services`, () => {
  const kibanaIndex = '.a-kibana-index';
  const mockConfig = createMockConfig({
    'kibana.index': kibanaIndex,
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
  (checkPrivilegesWithRequestFactory as jest.Mock).mockReturnValue(mockCheckPrivilegesWithRequest);
  const mockCheckPrivilegesDynamicallyWithRequest = Symbol();
  (checkPrivilegesDynamicallyWithRequestFactory as jest.Mock).mockReturnValue(
    mockCheckPrivilegesDynamicallyWithRequest
  );
  const mockActions = Symbol();
  (actionsFactory as jest.Mock).mockReturnValue(mockActions);
  // mockConfig.get.mock;
  const mockXpackInfoFeature = Symbol();
  const mockFeatures = Symbol();
  const mockXpackMainPlugin = {
    getFeatures: () => mockFeatures,
  };
  const mockPrivilegesService = Symbol();
  (privilegesFactory as jest.Mock).mockReturnValue(mockPrivilegesService);
  const mockAuthorizationMode = Symbol();
  (authorizationModeFactory as jest.Mock).mockReturnValue(mockAuthorizationMode);
  const mockSpaces = Symbol();

  const authorization = createAuthorizationService(
    mockServer as any,
    mockXpackInfoFeature as any,
    mockXpackMainPlugin as any,
    mockSpaces
  );

  const application = `kibana-${kibanaIndex}`;
  expect(getClient).toHaveBeenCalledWith(mockServer);
  expect(actionsFactory).toHaveBeenCalledWith(mockConfig);
  expect(checkPrivilegesWithRequestFactory).toHaveBeenCalledWith(
    mockActions,
    application,
    mockShieldClient
  );
  expect(checkPrivilegesDynamicallyWithRequestFactory).toHaveBeenCalledWith(
    mockCheckPrivilegesWithRequest,
    mockSpaces
  );
  expect(privilegesFactory).toHaveBeenCalledWith(mockActions, mockXpackMainPlugin);
  expect(authorizationModeFactory).toHaveBeenCalledWith(mockXpackInfoFeature);

  expect(authorization).toEqual({
    actions: mockActions,
    application,
    checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
    checkPrivilegesDynamicallyWithRequest: mockCheckPrivilegesDynamicallyWithRequest,
    mode: mockAuthorizationMode,
    privileges: mockPrivilegesService,
  });
});
