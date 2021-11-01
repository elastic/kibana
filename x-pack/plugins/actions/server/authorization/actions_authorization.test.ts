/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { securityMock } from '../../../../plugins/security/server/mocks';
import { ActionsAuthorization } from './actions_authorization';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import { AuthenticatedUser } from '../../../security/server';
import { AuthorizationMode } from './get_authorization_mode_by_source';

const request = {} as KibanaRequest;

const mockAuthorizationAction = (type: string, operation: string) => `${type}/${operation}`;
function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  const authentication = security.authc;
  // typescript is having trouble inferring jest's automocking
  (
    authorization.actions.savedObject.get as jest.MockedFunction<
      typeof authorization.actions.savedObject.get
    >
  ).mockImplementation(mockAuthorizationAction);
  authorization.mode.useRbacForRequest.mockReturnValue(true);
  return { authorization, authentication };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ensureAuthorized', () => {
  test('is a no-op when there is no authorization api', async () => {
    const actionsAuthorization = new ActionsAuthorization({
      request,
    });

    await actionsAuthorization.ensureAuthorized('create', 'myType');
  });

  test('is a no-op when the security license is disabled', async () => {
    const { authorization } = mockSecurity();
    authorization.mode.useRbacForRequest.mockReturnValue(false);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await actionsAuthorization.ensureAuthorized('create', 'myType');
  });

  test('ensures the user has privileges to use the operation on the Actions Saved Object type', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'create'),
          authorized: true,
        },
      ],
    });

    await actionsAuthorization.ensureAuthorized('create', 'myType');

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith('action', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: mockAuthorizationAction('action', 'create'),
    });
  });

  test('ensures the user has privileges to execute an Actions Saved Object type', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'execute'),
          authorized: true,
        },
      ],
    });

    await actionsAuthorization.ensureAuthorized('execute', 'myType');

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      'get'
    );
    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith(
      ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      'create'
    );
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [
        mockAuthorizationAction(ACTION_SAVED_OBJECT_TYPE, 'get'),
        mockAuthorizationAction(ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, 'create'),
      ],
    });
  });

  test('throws if user lacks the required privieleges', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'create'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myOtherType', 'create'),
          authorized: true,
        },
      ],
    });

    await expect(
      actionsAuthorization.ensureAuthorized('create', 'myType')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized to create a \\"myType\\" action"`);
  });

  test('exempts users from requiring privileges to execute actions when authorizationMode is Legacy', async () => {
    const { authorization, authentication } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      authentication,
      authorizationMode: AuthorizationMode.Legacy,
    });

    authentication.getCurrentUser.mockReturnValueOnce({
      username: 'some-user',
    } as unknown as AuthenticatedUser);

    await actionsAuthorization.ensureAuthorized('execute', 'myType');

    expect(authorization.actions.savedObject.get).not.toHaveBeenCalled();
    expect(checkPrivileges).not.toHaveBeenCalled();
  });
});
