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

const request = {} as KibanaRequest;

const auditLogger = actionsAuthorizationAuditLoggerMock.create();
const realAuditLogger = new ActionsAuthorizationAuditLogger();

const mockAuthorizationAction = (type: string, operation: string) => `${type}/${operation}`;
function mockAuthorization() {
  const authorization = securityMock.createSetup().authz;
  // typescript is having trouble inferring jest's automocking
  (authorization.actions.savedObject.get as jest.MockedFunction<
    typeof authorization.actions.savedObject.get
  >).mockImplementation(mockAuthorizationAction);
  return authorization;
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

  test('ensures the user has privileges to execute the operation on the Actions Saved Object type', async () => {
    const authorization = mockAuthorization();
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
    expect(checkPrivileges).toHaveBeenCalledWith(mockAuthorizationAction('action', 'create'));

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

  test('throws if user lacks the required privieleges', async () => {
    const authorization = mockAuthorization();
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
});
