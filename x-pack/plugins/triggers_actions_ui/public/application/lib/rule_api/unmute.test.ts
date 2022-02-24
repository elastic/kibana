/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { unmuteRule, unmuteRules } from './unmute';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('unmuteRules', () => {
  test('should call unmute rule API per rule', async () => {
    const ids = ['1', '2', '/'];
    const result = await unmuteRules({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1/_unmute_all",
        ],
        Array [
          "/api/alerting/rule/2/_unmute_all",
        ],
        Array [
          "/api/alerting/rule/%2F/_unmute_all",
        ],
      ]
    `);
  });
});

describe('unmuteRule', () => {
  test('should call unmute rule API', async () => {
    const result = await unmuteRule({ http, id: '1/' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerting/rule/1%2F/_unmute_all",
        ],
      ]
    `);
  });
});
