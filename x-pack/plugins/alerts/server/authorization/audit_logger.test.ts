/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsAuthorizationAuditLogger, ScopeType } from './audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#constructor`, () => {
  test('initializes a noop auditLogger if security logger is unavailable', () => {
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(undefined);

    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Consumer;
    const scope = 'myApp';
    const operation = 'create';
    expect(() => {
      alertsAuditLogger.alertsAuthorizationFailure(
        username,
        alertTypeId,
        scopeType,
        scope,
        operation
      );

      alertsAuditLogger.alertsAuthorizationSuccess(
        username,
        alertTypeId,
        scopeType,
        scope,
        operation
      );
    }).not.toThrow();
  });
});

describe(`#alertsUnscopedAuthorizationFailure`, () => {
  test('logs auth failure of operation', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const operation = 'create';

    alertsAuditLogger.alertsUnscopedAuthorizationFailure(username, operation);

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_unscoped_authorization_failure",
        "foo-user Unauthorized to create any alert types",
        Object {
          "operation": "create",
          "username": "foo-user",
        },
      ]
    `);
  });

  test('logs auth failure with producer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Producer;
    const scope = 'myOtherApp';
    const operation = 'create';

    alertsAuditLogger.alertsAuthorizationFailure(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_failure",
        "foo-user Unauthorized to create a \\"alert-type-id\\" alert by \\"myOtherApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "operation": "create",
          "scope": "myOtherApp",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});

describe(`#alertsAuthorizationFailure`, () => {
  test('logs auth failure with consumer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Consumer;
    const scope = 'myApp';
    const operation = 'create';

    alertsAuditLogger.alertsAuthorizationFailure(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_failure",
        "foo-user Unauthorized to create a \\"alert-type-id\\" alert for \\"myApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "operation": "create",
          "scope": "myApp",
          "scopeType": 0,
          "username": "foo-user",
        },
      ]
    `);
  });

  test('logs auth failure with producer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Producer;
    const scope = 'myOtherApp';
    const operation = 'create';

    alertsAuditLogger.alertsAuthorizationFailure(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_failure",
        "foo-user Unauthorized to create a \\"alert-type-id\\" alert by \\"myOtherApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "operation": "create",
          "scope": "myOtherApp",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});

describe(`#alertsBulkAuthorizationSuccess`, () => {
  test('logs auth success with consumer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const scopeType = ScopeType.Consumer;
    const authorizedEntries: Array<[string, string]> = [
      ['alert-type-id', 'myApp'],
      ['other-alert-type-id', 'myOtherApp'],
    ];
    const operation = 'create';

    alertsAuditLogger.alertsBulkAuthorizationSuccess(
      username,
      authorizedEntries,
      scopeType,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_success",
        "foo-user Authorized to create: \\"alert-type-id\\" alert for \\"myApp\\", \\"other-alert-type-id\\" alert for \\"myOtherApp\\"",
        Object {
          "authorizedEntries": Array [
            Array [
              "alert-type-id",
              "myApp",
            ],
            Array [
              "other-alert-type-id",
              "myOtherApp",
            ],
          ],
          "operation": "create",
          "scopeType": 0,
          "username": "foo-user",
        },
      ]
    `);
  });

  test('logs auth success with producer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const scopeType = ScopeType.Producer;
    const authorizedEntries: Array<[string, string]> = [
      ['alert-type-id', 'myApp'],
      ['other-alert-type-id', 'myOtherApp'],
    ];
    const operation = 'create';

    alertsAuditLogger.alertsBulkAuthorizationSuccess(
      username,
      authorizedEntries,
      scopeType,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_success",
        "foo-user Authorized to create: \\"alert-type-id\\" alert by \\"myApp\\", \\"other-alert-type-id\\" alert by \\"myOtherApp\\"",
        Object {
          "authorizedEntries": Array [
            Array [
              "alert-type-id",
              "myApp",
            ],
            Array [
              "other-alert-type-id",
              "myOtherApp",
            ],
          ],
          "operation": "create",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});

describe(`#savedObjectsAuthorizationSuccess`, () => {
  test('logs auth success with consumer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Consumer;
    const scope = 'myApp';
    const operation = 'create';

    alertsAuditLogger.alertsAuthorizationSuccess(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_success",
        "foo-user Authorized to create a \\"alert-type-id\\" alert for \\"myApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "operation": "create",
          "scope": "myApp",
          "scopeType": 0,
          "username": "foo-user",
        },
      ]
    `);
  });

  test('logs auth success with producer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertsAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Producer;
    const scope = 'myOtherApp';
    const operation = 'create';

    alertsAuditLogger.alertsAuthorizationSuccess(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerts_authorization_success",
        "foo-user Authorized to create a \\"alert-type-id\\" alert by \\"myOtherApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "operation": "create",
          "scope": "myOtherApp",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});
