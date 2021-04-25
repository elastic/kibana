/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { enableAlert, enableAlerts } from './enable';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('enableAlert', () => {
  test('should call enable alert API', async () => {
    const result = await enableAlert({ http, id: '1/' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1%2F/_enable",
        ],
      ]
    `);
  });
});

describe('enableAlerts', () => {
  test('should call enable alert API per alert', async () => {
    const ids = ['1', '2', '/'];
    const result = await enableAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1/_enable",
        ],
        Array [
          "/api/alerting/rule/2/_enable",
        ],
        Array [
          "/api/alerting/rule/%2F/_enable",
        ],
      ]
    `);
  });
});
