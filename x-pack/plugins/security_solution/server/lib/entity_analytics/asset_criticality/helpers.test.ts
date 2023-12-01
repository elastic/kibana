/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyCriticalityToScore } from './helpers';

describe('applyCriticalityToScore', () => {
  it('returns the original score if the modifier is undefined', () => {
    const result = applyCriticalityToScore({ modifier: undefined, score: 90 });
    expect(result).toEqual(90);
  });

  it('returns the same score if the modifier is 1', () => {
    const result = applyCriticalityToScore({ modifier: 1, score: 90 });
    expect(result).toEqual(90);
  });

  it('returns an increased score if the modifier is greater than 1', () => {
    const result = applyCriticalityToScore({ modifier: 1.5, score: 90 });
    expect(result).toEqual(93);
  });

  it('returns a decreased score if the modifier is less than 1', () => {
    const result = applyCriticalityToScore({ modifier: 0.5, score: 90 });
    expect(result).toEqual(81);
  });

  it('does not exceed a score of 99 with a previous score of 99 and a large modifier', () => {
    const result = applyCriticalityToScore({ modifier: 200, score: 99 });
    expect(result).toEqual(99);
  });
});
