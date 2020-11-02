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

  test('works as expected', async () => {
    readySignal.signal(42);
    const ready = await readySignal.wait();
    expect(ready).toBe(42);
  });
});
