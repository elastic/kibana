/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingAuthorizationAuditLogger, ScopeType } from './audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#constructor`, () => {
  test('initializes a noop auditLogger if security logger is unavailable', () => {
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(undefined);

    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Consumer;
    const scope = 'myApp';
    const operation = 'create';
    const entity = 'rule';
    expect(() => {
      alertsAuditLogger.logAuthorizationFailure(
        username,
        alertTypeId,
        scopeType,
        scope,
        operation,
        entity
      );

      alertsAuditLogger.logAuthorizationSuccess(
        username,
        alertTypeId,
        scopeType,
        scope,
        operation,
        entity
      );
    }).not.toThrow();
  });
});

describe(`#logUnscopedAuthorizationFailure`, () => {
  test('logs auth failure of operation', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logUnscopedAuthorizationFailure(username, operation, entity);

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_unscoped_authorization_failure",
        "foo-user Unauthorized to create rules for any rule types",
        Object {
          "operation": "create",
          "username": "foo-user",
        },
      ]
    `);
  });

  test('logs auth failure with producer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Producer;
    const scope = 'myOtherApp';
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logAuthorizationFailure(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_failure",
        "foo-user Unauthorized to create a \\"alert-type-id\\" rule by \\"myOtherApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "entity": "rule",
          "operation": "create",
          "scope": "myOtherApp",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});

describe(`#logAuthorizationFailure`, () => {
  test('logs auth failure with consumer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Consumer;
    const scope = 'myApp';
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logAuthorizationFailure(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_failure",
        "foo-user Unauthorized to create a \\"alert-type-id\\" rule for \\"myApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "entity": "rule",
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
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Producer;
    const scope = 'myOtherApp';
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logAuthorizationFailure(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_failure",
        "foo-user Unauthorized to create a \\"alert-type-id\\" rule by \\"myOtherApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "entity": "rule",
          "operation": "create",
          "scope": "myOtherApp",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});

describe(`#logBulkAuthorizationSuccess`, () => {
  test('logs auth success with consumer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const scopeType = ScopeType.Consumer;
    const authorizedEntries: Array<[string, string]> = [
      ['alert-type-id', 'myApp'],
      ['other-alert-type-id', 'myOtherApp'],
    ];
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logBulkAuthorizationSuccess(
      username,
      authorizedEntries,
      scopeType,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_success",
        "foo-user Authorized to create: \\"alert-type-id\\" rules for \\"myApp\\", \\"other-alert-type-id\\" rules for \\"myOtherApp\\"",
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
          "entity": "rule",
          "operation": "create",
          "scopeType": 0,
          "username": "foo-user",
        },
      ]
    `);
  });

  test('logs auth success with producer scope', () => {
    const auditLogger = createMockAuditLogger();
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const scopeType = ScopeType.Producer;
    const authorizedEntries: Array<[string, string]> = [
      ['alert-type-id', 'myApp'],
      ['other-alert-type-id', 'myOtherApp'],
    ];
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logBulkAuthorizationSuccess(
      username,
      authorizedEntries,
      scopeType,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_success",
        "foo-user Authorized to create: \\"alert-type-id\\" rules by \\"myApp\\", \\"other-alert-type-id\\" rules by \\"myOtherApp\\"",
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
          "entity": "rule",
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
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Consumer;
    const scope = 'myApp';
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logAuthorizationSuccess(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_success",
        "foo-user Authorized to create a \\"alert-type-id\\" rule for \\"myApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "entity": "rule",
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
    const alertsAuditLogger = new AlertingAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const alertTypeId = 'alert-type-id';
    const scopeType = ScopeType.Producer;
    const scope = 'myOtherApp';
    const operation = 'create';
    const entity = 'rule';

    alertsAuditLogger.logAuthorizationSuccess(
      username,
      alertTypeId,
      scopeType,
      scope,
      operation,
      entity
    );

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alerting_authorization_success",
        "foo-user Authorized to create a \\"alert-type-id\\" rule by \\"myOtherApp\\"",
        Object {
          "alertTypeId": "alert-type-id",
          "entity": "rule",
          "operation": "create",
          "scope": "myOtherApp",
          "scopeType": 1,
          "username": "foo-user",
        },
      ]
    `);
  });
});
