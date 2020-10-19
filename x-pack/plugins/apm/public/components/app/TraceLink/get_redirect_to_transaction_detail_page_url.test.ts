/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { roundToNearestMinute } from './get_redirect_to_transaction_detail_page_url';

describe('roundToNearestMinute', () => {
  it('should round up to nearest 5 minute', () => {
    expect(
      roundToNearestMinute({
        timestamp: '2020-01-01T00:00:40.000Z',
        direction: 'up',
      })
    ).toBe('2020-01-01T00:05:00.000Z');
  });

  it('should round down to nearest 5 minute', () => {
    expect(
      roundToNearestMinute({
        timestamp: '2020-01-01T00:00:40.000Z',
        direction: 'down',
      })
    ).toBe('2020-01-01T00:00:00.000Z');
  });

  it('should add diff and round up', () => {
    expect(
      roundToNearestMinute({
        timestamp: '2020-01-01T00:00:40.000Z',
        diff: 1000 * 60 * 7, // 7 minutes
        direction: 'up',
      })
    ).toBe('2020-01-01T00:10:00.000Z');
  });

  it('should add diff and round down', () => {
    expect(
      roundToNearestMinute({
        timestamp: '2020-01-01T00:00:40.000Z',
        diff: 1000 * 60 * 7, // 7 minutes
        direction: 'down',
      })
    ).toBe('2020-01-01T00:05:00.000Z');
  });
});
