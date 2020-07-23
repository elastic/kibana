/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionsAuthorizationAuditLogger } from './audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#constructor`, () => {
  test('initializes a noop auditLogger if security logger is unavailable', () => {
    const actionsAuditLogger = new ActionsAuthorizationAuditLogger(undefined);

    const username = 'foo-user';
    const actionTypeId = 'action-type-id';
    const operation = 'create';
    expect(() => {
      actionsAuditLogger.actionsAuthorizationFailure(username, operation, actionTypeId);
      actionsAuditLogger.actionsAuthorizationSuccess(username, operation, actionTypeId);
    }).not.toThrow();
  });
});

describe(`#actionsAuthorizationFailure`, () => {
  test('logs auth failure', () => {
    const auditLogger = createMockAuditLogger();
    const actionsAuditLogger = new ActionsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const actionTypeId = 'action-type-id';
    const operation = 'create';

    actionsAuditLogger.actionsAuthorizationFailure(username, operation, actionTypeId);

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "actions_authorization_failure",
        "foo-user Unauthorized to create a \\"action-type-id\\" action",
        Object {
          "actionTypeId": "action-type-id",
          "operation": "create",
          "username": "foo-user",
        },
      ]
    `);
  });
});

describe(`#savedObjectsAuthorizationSuccess`, () => {
  test('logs auth success', () => {
    const auditLogger = createMockAuditLogger();
    const actionsAuditLogger = new ActionsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const actionTypeId = 'action-type-id';

    const operation = 'create';

    actionsAuditLogger.actionsAuthorizationSuccess(username, operation, actionTypeId);

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "actions_authorization_success",
        "foo-user Authorized to create a \\"action-type-id\\" action",
        Object {
          "actionTypeId": "action-type-id",
          "operation": "create",
          "username": "foo-user",
        },
      ]
    `);
  });
});
