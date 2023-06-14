/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIntervalInSeconds } from './get_interval_in_seconds';

describe('get interval in seconds', () => {
  it('when interval is 5 seconds', () => {
    const intervalInSeconds = getIntervalInSeconds('5s');
    expect(intervalInSeconds).toEqual(5);
  });

  it('when interval is 5 minutes', () => {
    const intervalInSeconds = getIntervalInSeconds('5m');
    expect(intervalInSeconds).toEqual(300);
  });

  it('when interval is 5 hours', () => {
    const intervalInSeconds = getIntervalInSeconds('5h');
    expect(intervalInSeconds).toEqual(18000);
  });

  it('when interval is 5 days', () => {
    const intervalInSeconds = getIntervalInSeconds('5d');
    expect(intervalInSeconds).toEqual(432000);
  });

  it('throws error when interval string is invalid', () => {
    expect(() => getIntervalInSeconds('5 days')).toThrow(
      'Invalid interval string format.'
    );
  });
});
