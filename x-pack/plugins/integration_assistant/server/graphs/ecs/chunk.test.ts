/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, mergeAndChunkSamples } from './chunk';

describe('test chunks', () => {
  it('merge()', async () => {
    const target = {
      a: 1,
      b: 2,
      c: {
        d: 3,
      },
    };
    const source = {
      a: 2,
      b: 3,
      e: 4,
    };
    const result = merge(target, source);
    expect(result).toEqual({
      a: 1,
      b: 2,
      c: {
        d: 3,
      },
      e: 4,
    });
  });
  it('mergeAndChunkSamples()', async () => {
    const objects = ['{"a": 1, "b": 2, "c": {"d": 3}}', '{"a": 2, "b": 3, "e": 4}'];
    const chunkSize = 2;
    const result = mergeAndChunkSamples(objects, chunkSize);
    expect(result).toEqual(['{"a":1,"b":2}', '{"c":{"d":3},"e":4}']);
  });
});
