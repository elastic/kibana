/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { findRoute } from '../find';

const server = createMockServer();
findRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('sends proper arguments to action find function', async () => {
  const request = {
    method: 'GET',
    url:
      '/api/action/_find?' +
      'per_page=1&' +
      'page=1&' +
      'search=text*&' +
      'default_search_operator=AND&' +
      'search_fields=description&' +
      'sort_field=description&' +
      'fields=description',
  };

  server.plugins.actions.find.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ success: true });
  expect(server.plugins.actions.find).toMatchInlineSnapshot(`
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
        "defaultSearchOperator": "AND",
        "fields": Array [
          "description",
        ],
        "hasReference": undefined,
        "page": 1,
        "perPage": 1,
        "search": "text*",
        "searchFields": Array [
          "description",
        ],
        "sortField": "description",
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
