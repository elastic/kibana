/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createReadySignal, ReadySignal } from './ready_signal';

describe('ReadySignal', () => {
  let readySignal: ReadySignal<number>;

  beforeEach(() => {
    readySignal = createReadySignal<number>();
  });

  test('works as expected', async done => {
    let value = 41;

    timeoutSet(100, () => {
      expect(value).toBe(41);
    });

    timeoutSet(250, () => readySignal.signal(42));

    timeoutSet(400, async () => {
      expect(value).toBe(42);

      const innerValue = await readySignal.wait();
      expect(innerValue).toBe(42);
      done();
    });

    value = await readySignal.wait();
    expect(value).toBe(42);
  });
});

function timeoutSet(ms: number, fn: any) {
  setTimeout(fn, ms);
}
