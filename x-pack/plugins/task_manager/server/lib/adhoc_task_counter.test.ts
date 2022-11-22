/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AdHocTaskCounter } from './adhoc_task_counter';

describe('AdHocTaskCounter', () => {
  const counter = new AdHocTaskCounter();

  afterAll(() => {
    counter.reset();
  });

  it('increments counter', async () => {
    counter.increment(10);
    await expect(counter.count).toEqual(10);
  });

  it('resets counter', async () => {
    counter.increment(10);
    counter.reset();
    await expect(counter.count).toEqual(0);
  });
});
