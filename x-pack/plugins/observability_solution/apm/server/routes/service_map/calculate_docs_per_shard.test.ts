/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateDocsPerShard } from './calculate_docs_per_shard';

describe('calculateDocsPerShard', () => {
  it('calculates correct docs per shard', () => {
    expect(
      calculateDocsPerShard({
        serverlessServiceMapMaxAvailableBytes: 2_576_980_377,
        avgDocSizeInBytes: 495,
        totalShards: 3,
        numOfRequests: 10,
      })
    ).toBe(173534);
  });
  it('handles zeros', () => {
    expect(() =>
      calculateDocsPerShard({
        serverlessServiceMapMaxAvailableBytes: 0,
        avgDocSizeInBytes: 0,
        totalShards: 0,
        numOfRequests: 0,
      })
    ).toThrow('all parameters must be > 0');
  });
});
