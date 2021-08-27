/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertAuditAction, alertAuditEvent } from './audit_events';

describe('#alertAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        outcome: 'unknown',
        id: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_get",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "access",
          ],
        },
        "message": "User is accessing alert [id=123]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        id: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_get",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "access",
          ],
        },
        "message": "User has accessed alert [id=123]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        id: '123',
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "alert_get",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "access",
          ],
        },
        "message": "Failed attempt to access alert [id=123]",
      }
    `);
  });
});
