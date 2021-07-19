/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { disableAlert, disableAlerts } from './disable';

const http = httpServiceMock.createStartContract();
beforeEach(() => jest.resetAllMocks());

describe('disableAlert', () => {
  test('should call disable alert API', async () => {
    const result = await disableAlert({ http, id: '1/' });
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

describe('disableAlerts', () => {
  test('should call disable alert API per alert', async () => {
    const ids = ['1', '2', '/'];
    const result = await disableAlerts({ http, ids });
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
