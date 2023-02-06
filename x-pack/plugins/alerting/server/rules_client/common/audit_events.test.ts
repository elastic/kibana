/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAuditAction, ruleAuditEvent } from './audit_events';

describe('#ruleAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id: 'ALERT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "User is creating rule [id=ALERT_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        savedObject: { type: 'alert', id: 'ALERT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "User has created rule [id=ALERT_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
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
          "action": "rule_create",
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "creation",
          ],
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ALERT_ID",
            "type": "alert",
          },
        },
        "message": "Failed attempt to create rule [id=ALERT_ID]",
      }
    `);
  });
});
