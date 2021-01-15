/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventOutcome } from '../../../security/server/audit';
import { AlertAuditAction, alertAuditEvent } from './audit_events';

describe('#alertAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.CREATE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type: 'alert', id: 'ALERT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_create",
          "category": "database",
          "outcome": "unknown",
          "type": "creation",
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "User is creating alert [id=ALERT_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.CREATE,
        savedObject: { type: 'alert', id: 'ALERT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_create",
          "category": "database",
          "outcome": "success",
          "type": "creation",
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "User has created alert [id=ALERT_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      alertAuditEvent({
        action: AlertAuditAction.CREATE,
        savedObject: { type: 'alert', id: 'ALERT_ID' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "alert_create",
          "category": "database",
          "outcome": "failure",
          "type": "creation",
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "Failed attempt to create alert [id=ALERT_ID]",
      }
    `);
  });
});
