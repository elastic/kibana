/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adjustTimeRange } from './adjust_timerange';
import moment from 'moment';

/** Get the return type of adjustTimeRange for TypeScript checks against expected */
type ReturnTypeAdjustTimeRange = ReturnType<typeof adjustTimeRange>;

describe('adjust_timerange', () => {
  beforeEach(() => {
    // Adds extra switch to suppress deprecation warnings that moment does not expose in TypeScript
    (
      moment as typeof moment & {
        suppressDeprecationWarnings: boolean;
      }
    ).suppressDeprecationWarnings = true;
  });

  afterEach(() => {
    // Adds extra switch to suppress deprecation warnings that moment does not expose in TypeScript
    (
      moment as typeof moment & {
        suppressDeprecationWarnings: boolean;
      }
    ).suppressDeprecationWarnings = false;
  });

  test('it will adjust the time range from by rounding down by an hour within "from"', () => {
    expect(
      adjustTimeRange({
        interval: '5m',
        to: '2021-07-06T22:07:56.972Z',
        from: '2021-07-06T22:07:56.972Z',
      })
    ).toMatchObject<Partial<ReturnTypeAdjustTimeRange>>({
      timeRangeAdjusted: {
        interval: '5m',
        to: '2021-07-06T22:07:56.972Z',
        from: '2021-07-06T22:00:00.000Z', // <-- Rounded down by an hour
      },
    });
  });

  test('it will compute the duration between to and and from', () => {
    expect(
      adjustTimeRange({
        interval: '5m',
        to: '2021-07-06T22:08:56.972Z',
        from: '2021-07-06T22:07:56.972Z',
      }).duration?.asMinutes()
    ).toEqual(1);
  });

  test('it will return "undefined" if the to and from are invalid dateMath parsable', () => {
    expect(
      adjustTimeRange({
        interval: '5m',
        to: 'now-invalid',
        from: 'now-invalid2',
      })
    ).toMatchObject<Partial<ReturnTypeAdjustTimeRange>>({
      timeRangeAdjusted: undefined,
      duration: undefined,
    });
  });
});
