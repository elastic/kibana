/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timeoutPromiseAfter } from './timeout_promise_after';

const delay = (ms: number, result: unknown) =>
  new Promise((resolve) => setTimeout(() => resolve(result), ms));

const delayRejection = (ms: number, result: unknown) =>
  new Promise((resolve, reject) => setTimeout(() => reject(result), ms));

describe('Promise Timeout', () => {
  test('resolves when wrapped promise resolves', async () => {
    return expect(
      timeoutPromiseAfter(delay(100, 'OK'), 1000, () => 'TIMEOUT ERR')
    ).resolves.toMatchInlineSnapshot(`"OK"`);
  });

  test('reject when wrapped promise rejects', async () => {
    return expect(
      timeoutPromiseAfter(delayRejection(100, 'ERR'), 1000, () => 'TIMEOUT ERR')
    ).rejects.toMatchInlineSnapshot(`"ERR"`);
  });

  test('reject it the timeout elapses', async () => {
    return expect(
      timeoutPromiseAfter(delay(1000, 'OK'), 100, () => 'TIMEOUT ERR')
    ).rejects.toMatchInlineSnapshot(`"TIMEOUT ERR"`);
  });
});
