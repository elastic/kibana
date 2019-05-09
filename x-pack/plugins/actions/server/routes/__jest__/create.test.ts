/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { createRoute } from '../create';

const server = createMockServer();
createRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('creates an action with proper parameters', async () => {
  const request = {
    method: 'POST',
    url: '/api/action',
    payload: {
      attributes: {
        description: 'My description',
        actionTypeId: 'abc',
        actionTypeConfig: { foo: true },
      },
      migrationVersion: {
        abc: '1.2.3',
      },
      references: [
        {
          name: 'ref_0',
          type: 'bcd',
          id: '234',
        },
      ],
    },
  };

  server.plugins.actions.create.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ success: true });
  expect(server.plugins.actions.create).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "bulkCreate": [MockFunction],
        "bulkGet": [MockFunction],
        "create": [MockFunction],
        "delete": [MockFunction],
        "errors": Object {},
        "find": [MockFunction],
        "get": [MockFunction],
        "update": [MockFunction],
      },
      Object {
        "actionTypeConfig": Object {
          "foo": true,
        },
        "actionTypeId": "abc",
        "description": "My description",
      },
      Object {
        "migrationVersion": Object {
          "abc": "1.2.3",
        },
        "references": Array [
          Object {
            "id": "234",
            "name": "ref_0",
            "type": "bcd",
          },
        ],
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": Promise {},
    },
  ],
}
`);
});
