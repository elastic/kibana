/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EventOutcome,
  SavedObjectAction,
  savedObjectEvent,
  userLoginEvent,
  httpRequestEvent,
} from './audit_events';
import { AuthenticationResult } from '../authentication';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { httpServerMock } from 'src/core/server/mocks';

describe('#savedObjectEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.CREATE,
        outcome: EventOutcome.UNKNOWN,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
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
        },
        "message": "User is creating dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.CREATE,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
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
        },
        "message": "User has created dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.CREATE,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
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
        },
        "message": "Failed attempt to create dashboard [id=SAVED_OBJECT_ID]",
      }
    `);
  });
});

describe('#userLoginEvent', () => {
  test('creates event with `success` outcome', () => {
    expect(
      userLoginEvent({
        authenticationResult: AuthenticationResult.succeeded(mockAuthenticatedUser()),
        authenticationProvider: 'basic1',
        authenticationType: 'basic',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "user_login",
          "category": "authentication",
          "outcome": "success",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_realm": "native1",
          "authentication_type": "basic",
          "lookup_realm": "native1",
          "space_id": undefined,
        },
        "message": "User [user] has logged in using basic provider [name=basic1]",
        "user": Object {
          "name": "user",
          "roles": Array [
            "user-role",
          ],
        },
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      userLoginEvent({
        authenticationResult: AuthenticationResult.failed(new Error('Not Authorized')),
        authenticationProvider: 'basic1',
        authenticationType: 'basic',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "Not Authorized",
        },
        "event": Object {
          "action": "user_login",
          "category": "authentication",
          "outcome": "failure",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_realm": undefined,
          "authentication_type": "basic",
          "lookup_realm": undefined,
          "space_id": undefined,
        },
        "message": "Failed attempt to login using basic provider [name=basic1]",
        "user": undefined,
      }
    `);
  });
});

describe('#httpRequestEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      httpRequestEvent({
        request: httpServerMock.createKibanaRequest(),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "http_request",
          "category": "web",
          "outcome": "unknown",
        },
        "http": Object {
          "request": Object {
            "method": "get",
          },
        },
        "message": "User is requesting [/path] endpoint",
        "url": Object {
          "domain": undefined,
          "path": "/path",
          "port": undefined,
          "query": undefined,
          "scheme": undefined,
        },
      }
    `);
  });
});
