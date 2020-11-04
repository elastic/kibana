/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { securityMock } from '../../../../plugins/security/server/mocks';
import { ActionsAuthorization } from './actions_authorization';
import { actionsAuthorizationAuditLoggerMock } from './audit_logger.mock';
import { ActionsAuthorizationAuditLogger, AuthorizationResult } from './audit_logger';
import { ACTION_SAVED_OBJECT_TYPE, ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '../saved_objects';
import { AuthenticatedUser } from '../../../security/server';
import { AuthorizationMode } from './get_authorization_mode_by_source';

const request = {} as KibanaRequest;

const auditLogger = actionsAuthorizationAuditLoggerMock.create();
const realAuditLogger = new ActionsAuthorizationAuditLogger();

const mockAuthorizationAction = (type: string, operation: string) => `${type}/${operation}`;
function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  const authentication = security.authc;
  // typescript is having trouble inferring jest's automocking
  (authorization.actions.savedObject.get as jest.MockedFunction<
    typeof authorization.actions.savedObject.get
  >).mockImplementation(mockAuthorizationAction);
  authorization.mode.useRbacForRequest.mockReturnValue(true);
  return { authorization, authentication };
}

beforeEach(() => {
  jest.resetAllMocks();
  auditLogger.actionsAuthorizationFailure.mockImplementation((username, ...args) =>
    realAuditLogger.getAuthorizationMessage(AuthorizationResult.Unauthorized, ...args)
  );
  auditLogger.actionsAuthorizationSuccess.mockImplementation((username, ...args) =>
    realAuditLogger.getAuthorizationMessage(AuthorizationResult.Authorized, ...args)
  );
});

describe('ensureAuthorized', () => {
  test('is a no-op when there is no authorization api', async () => {
    const actionsAuthorization = new ActionsAuthorization({
      request,
      auditLogger,
    });

    await actionsAuthorization.ensureAuthorized('create', 'myType');
  });

  test('is a no-op when the security license is disabled', async () => {
    const { authorization } = mockSecurity();
    authorization.mode.useRbacForRequest.mockReturnValue(false);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      auditLogger,
    });

    await actionsAuthorization.ensureAuthorized('create', 'myType');
  });

  test('ensures the user has privileges to use the operation on the Actions Saved Object type', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      auditLogger,
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

    expect(auditLogger.actionsAuthorizationSuccess).toHaveBeenCalledTimes(1);
    expect(auditLogger.actionsAuthorizationFailure).not.toHaveBeenCalled();
    expect(auditLogger.actionsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "some-user",
        "create",
        "myType",
      ]
    `);
  });

  test('ensures the user has privileges to execute an Actions Saved Object type', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      auditLogger,
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

    expect(auditLogger.actionsAuthorizationSuccess).toHaveBeenCalledTimes(1);
    expect(auditLogger.actionsAuthorizationFailure).not.toHaveBeenCalled();
    expect(auditLogger.actionsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "some-user",
        "execute",
        "myType",
      ]
    `);
  });

  test('throws if user lacks the required privieleges', async () => {
    const { authorization } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      auditLogger,
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

    expect(auditLogger.actionsAuthorizationSuccess).not.toHaveBeenCalled();
    expect(auditLogger.actionsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(auditLogger.actionsAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "some-user",
        "create",
        "myType",
      ]
    `);
  });

  test('exempts users from requiring privileges to execute actions when authorizationMode is Legacy', async () => {
    const { authorization, authentication } = mockSecurity();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    const actionsAuthorization = new ActionsAuthorization({
      request,
      authorization,
      authentication,
      auditLogger,
      authorizationMode: AuthorizationMode.Legacy,
    });

    authentication.getCurrentUser.mockReturnValueOnce(({
      username: 'some-user',
    } as unknown) as AuthenticatedUser);

    await actionsAuthorization.ensureAuthorized('execute', 'myType');

    expect(authorization.actions.savedObject.get).not.toHaveBeenCalled();
    expect(checkPrivileges).not.toHaveBeenCalled();

    expect(auditLogger.actionsAuthorizationSuccess).toHaveBeenCalledTimes(1);
    expect(auditLogger.actionsAuthorizationFailure).not.toHaveBeenCalled();
    expect(auditLogger.actionsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "some-user",
        "execute",
        "myType",
      ]
    `);
  });
});
