/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { delay } from './delay';

const TEST_DELAY = 100;

describe('delay', () => {
  test('works as expected', async () => {
    const timeStart = Date.now();
    await delay(TEST_DELAY);

    // note: testing with .toBeGreaterThanOrEqual(TEST_DELAY) is flaky,
    // sometimes the actual value is TEST_DELAY - 1, so ... using that as the
    // value to test against; something funky with time rounding I'd guess.
    expect(Date.now() - timeStart).toBeGreaterThanOrEqual(TEST_DELAY - 1);
  });
});
