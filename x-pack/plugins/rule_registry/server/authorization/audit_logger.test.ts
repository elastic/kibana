/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EventType } from '../../../security/server';

import { RacAuthorizationAuditLogger } from './audit_logger';

const createMockAuditLogger = () => {
  return {
    log: jest.fn(),
  };
};

describe(`#constructor`, () => {
  test('initializes a noop auditLogger if security logger is unavailable', () => {
    const racAuditLogger = new RacAuthorizationAuditLogger(undefined);

    const username = 'foo-user';
    const owner = 'myApp';
    const operation = 'create';
    const type = EventType.ACCESS;
    const error = new Error('my bad');
    expect(() => {
      racAuditLogger.racAuthorizationFailure({
        username,
        owner,
        operation,
        type,
        error,
      });

      racAuditLogger.racAuthorizationSuccess({
        username,
        owner,
        operation,
        type,
      });
    }).not.toThrow();
  });
});

describe(`#racAuthorizationSuccess`, () => {
  test('logs auth success of operation', () => {
    const auditLogger = createMockAuditLogger();
    const racAuditLogger = new RacAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const owner = 'myApp';
    const operation = 'create';
    const type = EventType.ACCESS;

    racAuditLogger.racAuthorizationSuccess({ username, operation, owner, type });

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "event": Object {
            "action": "rac_authorization_success",
            "category": "authentication",
            "outcome": "success",
            "type": "access",
          },
          "message": "Authorized to create \\"myApp\\" alert\\"",
          "user": Object {
            "name": "foo-user",
          },
        },
      ]
    `);
  });
});

describe(`#racUnscopedAuthorizationFailure`, () => {
  test('logs auth failure of operation', () => {
    const auditLogger = createMockAuditLogger();
    const racAuditLogger = new RacAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const operation = 'create';
    const type = EventType.ACCESS;

    racAuditLogger.racUnscopedAuthorizationFailure({ username, operation, type });

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "event": Object {
            "action": "rac_authorization_failure",
            "category": "authentication",
            "outcome": "failure",
            "type": "access",
          },
          "message": "Unauthorized to create any alerts",
          "user": Object {
            "name": "foo-user",
          },
        },
      ]
    `);
  });
});

describe(`#racAuthorizationFailure`, () => {
  test('logs auth failure', () => {
    const auditLogger = createMockAuditLogger();
    const racAuditLogger = new RacAuthorizationAuditLogger(auditLogger);
    const username = 'foo-user';
    const owner = 'myApp';
    const operation = 'create';
    const type = EventType.ACCESS;
    const error = new Error('my bad');

    racAuditLogger.racAuthorizationFailure({ username, owner, operation, type, error });

    expect(auditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "code": "Error",
            "message": "my bad",
          },
          "event": Object {
            "action": "rac_authorization_failure",
            "category": "authentication",
            "outcome": "failure",
            "type": "access",
          },
          "message": "Unauthorized to create \\"myApp\\" alert\\"",
          "user": Object {
            "name": "foo-user",
          },
        },
      ]
    `);
  });
});
