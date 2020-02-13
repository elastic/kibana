/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { listAlertTypesRoute } from './list_alert_types';

const { server, alertTypeRegistry } = createMockServer();
server.route(listAlertTypesRoute);

beforeEach(() => jest.resetAllMocks());

test('calls the list function', async () => {
  const request = {
    method: 'GET',
    url: '/api/alert/types',
  };

  alertTypeRegistry.list.mockReturnValueOnce([]);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual([]);
  expect(alertTypeRegistry.list).toHaveBeenCalledTimes(1);
  expect(alertTypeRegistry.list.mock.calls[0]).toMatchInlineSnapshot(`Array []`);
});
