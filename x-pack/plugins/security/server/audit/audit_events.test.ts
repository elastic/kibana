/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URL } from 'url';
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

  test('does create event for read access of saved objects', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.GET,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
    expect(
      savedObjectEvent({
        action: SavedObjectAction.FIND,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
  });

  test('does not create event for read access of config or telemetry objects', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.GET,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: SavedObjectAction.GET,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: SavedObjectAction.FIND,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: SavedObjectAction.FIND,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
  });

  test('does create event for write access of config or telemetry objects', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.UPDATE,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
    expect(
      savedObjectEvent({
        action: SavedObjectAction.UPDATE,
        savedObject: { type: 'telemetry', id: 'SAVED_OBJECT_ID' },
      })
    ).not.toBeUndefined();
  });

  test('creates event with `success` outcome for `REMOVE_REFERENCES` action', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.REMOVE_REFERENCES,
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_remove_references",
          "category": "database",
          "outcome": "success",
          "type": "change",
        },
        "kibana": Object {
          "add_to_spaces": undefined,
          "delete_from_spaces": undefined,
          "saved_object": Object {
            "id": "SAVED_OBJECT_ID",
            "type": "dashboard",
          },
        },
        "message": "User has removed references to dashboard [id=SAVED_OBJECT_ID]",
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
          "domain": "localhost",
          "path": "/path",
          "port": undefined,
          "query": undefined,
          "scheme": "http:",
        },
      }
    `);
  });

  test('uses original URL if rewritten', () => {
    expect(
      httpRequestEvent({
        request: httpServerMock.createKibanaRequest({
          path: '/path',
          query: { query: 'param' },
          kibanaRequestState: {
            requestId: '123',
            requestUuid: '123e4567-e89b-12d3-a456-426614174000',
            rewrittenUrl: new URL('http://localhost/original/path?query=param'),
          },
        }),
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
        "message": "User is requesting [/original/path] endpoint",
        "url": Object {
          "domain": "localhost",
          "path": "/original/path",
          "port": undefined,
          "query": "query=param",
          "scheme": "http:",
        },
      }
    `);
  });
});
