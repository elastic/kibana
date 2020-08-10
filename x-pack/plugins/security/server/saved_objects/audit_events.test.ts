/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectEvent, SavedObjectAction } from './audit_events';
import { AuditEvent } from '../../../../../src/core/server';

const baseEvent: Pick<AuditEvent, 'user' | 'trace' | 'kibana'> = {
  user: { name: 'jdoe' },
  trace: { id: 'TRACE_ID' },
  kibana: { space_id: 'SPACE_ID' },
};

describe('#savedObjectCreateEvent', () => {
  test(`creates audit event with unknown outcome`, () => {
    expect(
      savedObjectEvent(baseEvent, {
        action: SavedObjectAction.CREATE,
        saved_object: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
        outcome: 'unknown',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_create",
          "category": "database",
          "outcome": "unknown",
          "type": "creation",
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "type": "dashboard",
          },
          "space_id": "SPACE_ID",
        },
        "message": "User [jdoe] is creating dashboard [id=SAVED_OBJECT_ID]",
        "trace": Object {
          "id": "TRACE_ID",
        },
        "user": Object {
          "name": "jdoe",
        },
      }
    `);
  });

  test(`creates audit event with success outcome`, () => {
    expect(
      savedObjectEvent(baseEvent, {
        action: SavedObjectAction.CREATE,
        saved_object: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
        outcome: 'success',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_create",
          "category": "database",
          "outcome": "success",
          "type": "creation",
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "type": "dashboard",
          },
          "space_id": "SPACE_ID",
        },
        "message": "User [jdoe] created dashboard [id=SAVED_OBJECT_ID]",
        "trace": Object {
          "id": "TRACE_ID",
        },
        "user": Object {
          "name": "jdoe",
        },
      }
    `);
  });

  test(`creates audit event with error message`, () => {
    expect(
      savedObjectEvent(baseEvent, {
        action: SavedObjectAction.CREATE,
        saved_object: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "saved_object_create",
          "category": "database",
          "outcome": "failure",
          "type": "creation",
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "type": "dashboard",
          },
          "space_id": "SPACE_ID",
        },
        "message": "Failed attempt to create dashboard [id=SAVED_OBJECT_ID] by user [jdoe]",
        "trace": Object {
          "id": "TRACE_ID",
        },
        "user": Object {
          "name": "jdoe",
        },
      }
    `);
  });
});
