/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { updateRoute } from '../update';

const { server, actionsClient } = createMockServer();
updateRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls the update function with proper parameters', async () => {
  const request = {
    method: 'PUT',
    url: '/api/action/1',
    payload: {
      attributes: {
        description: 'My description',
        actionTypeId: 'abc',
        actionTypeConfig: { foo: true },
      },
      version: '2',
      references: [
        {
          name: 'ref_0',
          type: 'bcd',
          id: '234',
        },
      ],
    },
  };

  actionsClient.update.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ success: true });
  expect(actionsClient.update).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "data": Object {
          "actionTypeConfig": Object {
            "foo": true,
          },
          "actionTypeId": "abc",
          "description": "My description",
        },
        "id": "1",
        "options": Object {
          "references": Array [
            Object {
              "id": "234",
              "name": "ref_0",
              "type": "bcd",
            },
          ],
          "version": "2",
        },
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
