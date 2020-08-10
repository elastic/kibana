/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { userLoginEvent } from './audit_events';
import { AuditEvent } from '../../../../../src/core/server';
import { AuthenticationResult } from './authentication_result';

const baseEvent: Pick<AuditEvent, 'user' | 'trace' | 'kibana'> = {
  user: undefined,
  trace: { id: 'TRACE_ID' },
  kibana: { space_id: 'SPACE_ID' },
};

describe('#savedObjectCreateEvent', () => {
  test(`creates audit event with success outcome`, () => {
    expect(
      userLoginEvent(baseEvent, {
        authenticationResult: ({
          user: {
            username: 'jdoe',
            roles: ['admin'],
            authentication_realm: { type: 'basic', name: 'basic' },
            lookup_realm: { type: 'basic', name: 'basic' },
          },
        } as unknown) as AuthenticationResult,
        authentication_provider: 'basic',
        authentication_type: 'basic',
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
          "authentication_provider": "basic",
          "authentication_realm": "basic",
          "authentication_type": "basic",
          "lookup_realm": "basic",
          "space_id": "SPACE_ID",
        },
        "message": "User [jdoe] logged in using basic provider [name=basic]",
        "trace": Object {
          "id": "TRACE_ID",
        },
        "user": Object {
          "name": "jdoe",
          "roles": Array [
            "admin",
          ],
        },
      }
    `);
  });

  test(`creates audit event with error message`, () => {
    expect(
      userLoginEvent(baseEvent, {
        authenticationResult: ({
          error: new Error('ERROR_MESSAGE'),
        } as unknown) as AuthenticationResult,
        authentication_provider: 'basic',
        authentication_type: 'basic',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "error": Object {
          "code": "Error",
          "message": "ERROR_MESSAGE",
        },
        "event": Object {
          "action": "user_login",
          "category": "authentication",
          "outcome": "failure",
        },
        "kibana": Object {
          "authentication_provider": "basic",
          "authentication_realm": undefined,
          "authentication_type": "basic",
          "lookup_realm": undefined,
          "space_id": "SPACE_ID",
        },
        "message": "Failed attemp to login using basic provider [name=basic]",
        "trace": Object {
          "id": "TRACE_ID",
        },
        "user": undefined,
      }
    `);
  });
});
