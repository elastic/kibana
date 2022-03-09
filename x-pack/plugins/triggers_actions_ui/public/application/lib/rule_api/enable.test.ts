/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { enableRule, enableRules } from './enable';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('enableRule', () => {
  test('should call enable rule API', async () => {
    const result = await enableRule({ http, id: '1/' });
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

describe('enableRules', () => {
  test('should call enable rule API per rule', async () => {
    const ids = ['1', '2', '/'];
    const result = await enableRules({ http, ids });
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
