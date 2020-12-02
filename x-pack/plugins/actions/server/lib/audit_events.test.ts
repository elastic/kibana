/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventOutcome } from '../../../security/server/audit';
import { ConnectorAuditAction, connectorAuditEvent } from './audit_events';

describe('#connectorAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      connectorAuditEvent({
        action: ConnectorAuditAction.CREATE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type: 'action', id: 'ACTION_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "connector_create",
          "category": "database",
          "outcome": "unknown",
          "type": "creation",
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ACTION_ID",
            "type": "action",
          },
        },
        "message": "User is creating connector [id=ACTION_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      connectorAuditEvent({
        action: ConnectorAuditAction.CREATE,
        savedObject: { type: 'action', id: 'ACTION_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "connector_create",
          "category": "database",
          "outcome": "success",
          "type": "creation",
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ACTION_ID",
            "type": "action",
          },
        },
        "message": "User has created connector [id=ACTION_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      connectorAuditEvent({
        action: ConnectorAuditAction.CREATE,
        savedObject: { type: 'action', id: 'ACTION_ID' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "connector_create",
          "category": "database",
          "outcome": "failure",
          "type": "creation",
        },
        "kibana": Object {
          "saved_object": Object {
            "id": "ACTION_ID",
            "type": "action",
          },
        },
        "message": "Failed attempt to create connector [id=ACTION_ID]",
      }
    `);
  });
});
