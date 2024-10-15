/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReadySignal, ReadySignal } from './ready_signal';

describe('ReadySignal', () => {
  let readySignal: ReadySignal<number>;

  beforeEach(() => {
    readySignal = createReadySignal<number>();
  });

  test('works as expected', async () => {
    expect(readySignal.isEmitted()).toEqual(false);
    readySignal.signal(42);
    expect(readySignal.isEmitted()).toEqual(true);
    const ready = await readySignal.wait();
    expect(ready).toBe(42);
    expect(readySignal.isEmitted()).toEqual(true);
  });
});
