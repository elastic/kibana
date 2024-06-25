/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { ActionsAuthorization } from './actions_authorization';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import { AuthorizationMode } from './get_authorization_mode_by_source';
import {
  CONNECTORS_ADVANCED_EXECUTE_PRIVILEGE_API_TAG,
  CONNECTORS_BASIC_EXECUTE_PRIVILEGE_API_TAG,
} from '../feature';
import { forEach } from 'lodash';

const request = {} as KibanaRequest;

const mockAuthorizationAction = (type: string, operation: string) => `${type}/${operation}`;
const BASIC_EXECUTE_AUTHZ = `api:${CONNECTORS_BASIC_EXECUTE_PRIVILEGE_API_TAG}`;
const ADVANCED_EXECUTE_AUTHZ = `api:${CONNECTORS_ADVANCED_EXECUTE_PRIVILEGE_API_TAG}`;

function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  // typescript is having trouble inferring jest's automocking
  (
    authorization.actions.savedObject.get as jest.MockedFunction<
      typeof authorization.actions.savedObject.get
    >
  ).mockImplementation(mockAuthorizationAction);
  authorization.mode.useRbacForRequest.mockReturnValue(true);
  return { authorization };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ensureAuthorized', () => {
  test('is a no-op when there is no authorization api', async () => {
    const actionsAuthorization = new ActionsAuthorization({
      request,
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' });
  });

  test('is a no-op when the security license is disabled', async () => {
    const { authorization } = mockSecurity();
    authorization.mode.useRbacForRequest.mockReturnValue(false);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' });
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

    await actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' });

    expect(authorization.actions.savedObject.get).toHaveBeenCalledWith('action', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: [mockAuthorizationAction('action', 'create'), BASIC_EXECUTE_AUTHZ],
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

    await actionsAuthorization.ensureAuthorized({ operation: 'execute', actionTypeId: 'myType' });

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
        BASIC_EXECUTE_AUTHZ,
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
      actionsAuthorization.ensureAuthorized({ operation: 'create', actionTypeId: 'myType' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unauthorized to create a \\"myType\\" action"`);
  });

  test('exempts users from requiring privileges to execute actions when authorizationMode is Legacy', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<
      ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
    > = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      authorizationMode: AuthorizationMode.Legacy,
    });

    await actionsAuthorization.ensureAuthorized({ operation: 'execute', actionTypeId: 'myType' });

    expect(authorization.actions.savedObject.get).not.toHaveBeenCalled();
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('checks additional privileges correctly', async () => {
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

    await actionsAuthorization.ensureAuthorized({
      operation: 'execute',
      actionTypeId: 'myType',
      additionalPrivileges: ['test/create'],
    });

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
        'test/create',
        BASIC_EXECUTE_AUTHZ,
      ],
    });
  });

  describe('Bi-directional connectors', () => {
    forEach(['.sentinelone', '.crowdstrike'], (actionTypeId) => {
      test(`checks ${actionTypeId} connector privileges correctly`, async () => {
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

        await actionsAuthorization.ensureAuthorized({
          operation: 'execute',
          actionTypeId,
        });

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
            ADVANCED_EXECUTE_AUTHZ,
          ],
        });
      });
    });
  });
});
