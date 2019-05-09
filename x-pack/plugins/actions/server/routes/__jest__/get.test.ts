/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { getRoute } from '../get';

const server = createMockServer();
getRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls get with proper parameters', async () => {
  const request = {
    method: 'GET',
    url: '/api/action/1',
  };

  server.plugins.actions.get.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ success: true });
  expect(server.plugins.actions.get).toMatchInlineSnapshot(`
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
      "1",
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
