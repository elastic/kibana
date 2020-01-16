/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { getActionRoute } from './get';
import { ActionResult } from '../types';

const { server, actionsClient } = createMockServer();
server.route(getActionRoute);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls get with proper parameters', async () => {
  const request = {
    method: 'GET',
    url: '/api/action/1',
  };
  const expectedResult: ActionResult = {
    id: '1',
    actionTypeId: 'my-action-type-id',
    config: {},
    name: 'my action type name',
  };

  actionsClient.get.mockResolvedValueOnce(expectedResult);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual(expectedResult);
  expect(actionsClient.get).toHaveBeenCalledTimes(1);
  expect(actionsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
  },
]
`);
});
