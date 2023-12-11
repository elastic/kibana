/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fullJitterBackOffFactory } from './full_jitter_backoff';

describe('FullJitterBackoff', () => {
  it('throws if the baseDelay is negative', async () => {
    expect(() => fullJitterBackOffFactory(-1, 2000).create()).toThrowErrorMatchingInlineSnapshot(
      `"baseDelay must not be negative"`
    );
  });

  it('throws if the maxBackoffTime is negative', async () => {
    expect(() => fullJitterBackOffFactory(5, -1).create()).toThrowErrorMatchingInlineSnapshot(
      `"maxBackoffTime must not be negative"`
    );
  });
});
