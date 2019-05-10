/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { getRoute } from '../get';

const { server, actionsClient } = createMockServer();
getRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls get with proper parameters', async () => {
  const request = {
    method: 'GET',
    url: '/api/action/1',
  };

  actionsClient.get.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ success: true });
  expect(actionsClient.get).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "id": "1",
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
