/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { listActionTypesRoute } from '../list_action_types';

const { server, actionTypeService } = createMockServer();
listActionTypesRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls the list function', async () => {
  const request = {
    method: 'GET',
    url: '/api/action/types',
  };

  actionTypeService.listTypes.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ success: true });
  expect(actionTypeService.listTypes).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [],
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
