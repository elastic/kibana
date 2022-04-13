/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import { httpServerMock } from 'src/core/server/mocks';

import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { AuthenticationResult } from '../authentication';
import {
  httpRequestEvent,
  SavedObjectAction,
  savedObjectEvent,
  sessionCleanupEvent,
  SpaceAuditAction,
  spaceAuditEvent,
  userLoginEvent,
  userLogoutEvent,
} from './audit_events';

describe('#savedObjectEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      savedObjectEvent({
        action: SavedObjectAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'dashboard', id: 'SAVED_OBJECT_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "saved_object_create",
          "category": Array [
            "database",
          ],
          "outcome": "unknown",
          "type": Array [
            "creation",
          ],
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
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "creation",
          ],
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
          "category": Array [
            "database",
          ],
          "outcome": "failure",
          "type": Array [
            "creation",
          ],
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
        action: SavedObjectAction.RESOLVE,
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
        action: SavedObjectAction.RESOLVE,
        savedObject: { type: 'config', id: 'SAVED_OBJECT_ID' },
      })
    ).toBeUndefined();
    expect(
      savedObjectEvent({
        action: SavedObjectAction.RESOLVE,
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
          "category": Array [
            "database",
          ],
          "outcome": "success",
          "type": Array [
            "change",
          ],
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
        sessionId: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "user_login",
          "category": Array [
            "authentication",
          ],
          "outcome": "success",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_realm": "native1",
          "authentication_type": "basic",
          "lookup_realm": "native1",
          "session_id": "123",
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
          "category": Array [
            "authentication",
          ],
          "outcome": "failure",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_realm": undefined,
          "authentication_type": "basic",
          "lookup_realm": undefined,
          "session_id": undefined,
          "space_id": undefined,
        },
        "message": "Failed attempt to login using basic provider [name=basic1]",
        "user": undefined,
      }
    `);
  });
});

describe('#userLogoutEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      userLogoutEvent({
        username: 'elastic',
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "user_logout",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
        },
        "message": "User [elastic] is logging out using basic provider [name=basic1]",
        "user": Object {
          "name": "elastic",
        },
      }
    `);

    expect(
      userLogoutEvent({
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "user_logout",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
        },
        "message": "User [undefined] is logging out using basic provider [name=basic1]",
        "user": undefined,
      }
    `);
  });
});

describe('#sessionCleanupEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      sessionCleanupEvent({
        usernameHash: 'abcdef',
        sessionId: 'sid',
        provider: { name: 'basic1', type: 'basic' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "session_cleanup",
          "category": Array [
            "authentication",
          ],
          "outcome": "unknown",
        },
        "kibana": Object {
          "authentication_provider": "basic1",
          "authentication_type": "basic",
          "session_id": "sid",
        },
        "message": "Removing invalid or expired session for user [hash=abcdef]",
        "user": Object {
          "hash": "abcdef",
        },
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
          "category": Array [
            "web",
          ],
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
          "scheme": "http",
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
          "category": Array [
            "web",
          ],
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
          "scheme": "http",
        },
      }
    `);
  });
});

describe('#spaceAuditEvent', () => {
  test('creates event with `unknown` outcome', () => {
    expect(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'space', id: 'SPACE_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "space_create",
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
            "id": "SPACE_ID",
            "type": "space",
          },
        },
        "message": "User is creating space [id=SPACE_ID]",
      }
    `);
  });

  test('creates event with `success` outcome', () => {
    expect(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        savedObject: { type: 'space', id: 'SPACE_ID' },
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": undefined,
        "event": Object {
          "action": "space_create",
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
            "id": "SPACE_ID",
            "type": "space",
          },
        },
        "message": "User has created space [id=SPACE_ID]",
      }
    `);
  });

  test('creates event with `failure` outcome', () => {
    expect(
      spaceAuditEvent({
        action: SpaceAuditAction.CREATE,
        savedObject: { type: 'space', id: 'SPACE_ID' },
        error: new Error('ERROR_MESSAGE'),
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "space_create",
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
            "id": "SPACE_ID",
            "type": "space",
          },
        },
        "message": "Failed attempt to create space [id=SPACE_ID]",
      }
    `);
  });
});
