/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { disableRule, disableRules } from './disable';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('disableRule', () => {
  test('should call disable rule API', async () => {
    const result = await disableRule({ http, id: '1/' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1%2F/_disable",
        ],
      ]
    `);
  });
});

describe('disableRules', () => {
  test('should call disable rule API per rule', async () => {
    const ids = ['1', '2', '/'];
    const result = await disableRules({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1/_disable",
        ],
        Array [
          "/api/alerting/rule/2/_disable",
        ],
        Array [
          "/api/alerting/rule/%2F/_disable",
        ],
      ]
    `);
  });
});
