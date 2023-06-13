/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIntervalInSeconds } from './get_interval_in_seconds';

describe('get lookback period in seconds for preview chart', () => {
  it('returns lookback period when interval is 5 seconds', () => {
    const lookback = getIntervalInSeconds('5s');
    expect(lookback).toEqual(25);
  });

  it('returns lookback period when interval is 5 minutes', () => {
    const lookback = getIntervalInSeconds('5m');
    expect(lookback).toEqual(1500);
  });

  it('returns lookback period when interval is 5 hours', () => {
    const lookback = getIntervalInSeconds('5h');
    expect(lookback).toEqual(90000);
  });

  it('returns lookback period when interval is 5 days', () => {
    const lookback = getIntervalInSeconds('5d');
    expect(lookback).toEqual(2160000);
  });

  it('throws error when interval string is invalid', () => {
    expect(() => getIntervalInSeconds('5 days')).toThrow(
      'Invalid interval string format.'
    );
  });
});
