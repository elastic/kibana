/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventOutcome } from '../../../security/server/audit';
import { AlertRuleAction, alertRuleEvent } from './audit_events';

describe('#alertRuleEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      alertRuleEvent({
        action: AlertRuleAction.CREATE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type: 'alert', id: 'ALERT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_rule_create",
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
        "message": "User is creating alert rule [id=ALERT_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      alertRuleEvent({
        action: AlertRuleAction.CREATE,
        savedObject: { type: 'alert', id: 'ALERT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "alert_rule_create",
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
        "message": "User has created alert rule [id=ALERT_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      alertRuleEvent({
        action: AlertRuleAction.CREATE,
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
          "action": "alert_rule_create",
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
        "message": "Failed attempt to create alert rule [id=ALERT_ID]",
      }
    `);
  });
});
