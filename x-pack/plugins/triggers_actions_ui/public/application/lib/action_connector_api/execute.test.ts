/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { executeAction } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('executeAction', () => {
  test('should call execute API', async () => {
    const id = '12/3';
    const params = {
      stringParams: 'someString',
      numericParams: 123,
    };

    http.post.mockResolvedValueOnce({
      connector_id: id,
      status: 'ok',
    });

    const result = await executeAction({ id, http, params });
    expect(result).toEqual({
      actionId: id,
      status: 'ok',
    });
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/actions/connector/12%2F3/_execute",
        Object {
          "body": "{\\"params\\":{\\"stringParams\\":\\"someString\\",\\"numericParams\\":123}}",
        },
      ]
    `);
  });
});
