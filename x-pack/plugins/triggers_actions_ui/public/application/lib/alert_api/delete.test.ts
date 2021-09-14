/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { deleteAlerts } from './delete';

const http = httpServiceMock.createStartContract();

describe('deleteAlerts', () => {
  test('should call delete API for each alert', async () => {
    const ids = ['1', '2', '/'];
    const result = await deleteAlerts({ http, ids });
    expect(result).toEqual({ errors: [], successes: [undefined, undefined, undefined] });
    expect(http.delete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1",
        ],
        Array [
          "/api/alerting/rule/2",
        ],
        Array [
          "/api/alerting/rule/%2F",
        ],
      ]
    `);
  });
});
