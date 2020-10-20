/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestScheduler } from 'rxjs/testing';
import { createRateLimiter } from './rxjs_utils';

describe('createRateLimiter', () => {
  it('should rate limit correctly with 1 request per 10ms', async () => {
    const scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    scheduler.run(({ expectObservable, cold }) => {
      const source = cold('a-b-c-d-e-f|');
      const intervalMs = 10;
      const perInterval = 1;
      const maxDelayMs = 50;
      const rateLimiter = createRateLimiter(intervalMs, perInterval, maxDelayMs, scheduler);
      const obs = source.pipe(rateLimiter());
      // f should be dropped because of maxDelay
      const results = 'a 9ms b 9ms c 9ms d 9ms (e|)';
      expectObservable(obs).toBe(results);
    });
  });
});
