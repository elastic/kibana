/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpRequestEvent } from './audit_events';
import { AuditEvent } from '../../../../../src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

const baseEvent: Pick<AuditEvent, 'user' | 'trace' | 'kibana'> = {
  user: { name: 'jdoe' },
  trace: { id: 'TRACE_ID' },
  kibana: { space_id: 'SPACE_ID' },
};

describe('#savedObjectCreateEvent', () => {
  test(`creates audit event with unknown outcome`, () => {
    expect(
      httpRequestEvent(baseEvent, {
        request: httpServerMock.createKibanaRequest({
          path: '/path?query=param',
          kibanaRequestState: { requestId: 'REQUEST_ID', requestUuid: 'REQUEST_UUID' },
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
        "kibana": Object {
          "space_id": "SPACE_ID",
        },
        "message": "User [jdoe] is requesting [/path] endpoint",
        "trace": Object {
          "id": "TRACE_ID",
        },
        "url": Object {
          "domain": undefined,
          "path": "/path",
          "port": undefined,
          "query": "query=param",
          "scheme": undefined,
        },
        "user": Object {
          "name": "jdoe",
        },
      }
    `);
  });
});
