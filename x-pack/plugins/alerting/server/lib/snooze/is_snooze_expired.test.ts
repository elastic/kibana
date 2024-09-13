/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Frequency } from '@kbn/rrule';
import { isSnoozeExpired } from './is_snooze_expired';
import { RRuleRecord } from '../../types';

const DATE_9999 = '9999-12-31T12:34:56.789Z';
const DATE_1970 = '1970-01-01T00:00:00.000Z';
const DATE_2019 = '2019-01-01T00:00:00.000Z';
const DATE_2019_PLUS_6_HOURS = '2019-01-01T06:00:00.000Z';
const DATE_2020 = '2020-01-01T00:00:00.000Z';
const DATE_2020_MINUS_1_HOUR = '2019-12-31T23:00:00.000Z';

const NOW = DATE_2020;

let fakeTimer: sinon.SinonFakeTimers;

describe('isSnoozeExpired', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date(NOW));
  });

  afterAll(() => fakeTimer.restore());

  test('returns false when snooze has not yet started', () => {
    const snooze = {
      duration: 100000000,
      rRule: {
        dtstart: DATE_9999,
        tzid: 'UTC',
        count: 1,
      } as RRuleRecord,
    };

    expect(isSnoozeExpired(snooze)).toBe(false);
  });

  test('returns false when snooze has started but not ended', () => {
    const snooze = {
      duration: 100000000,
      rRule: {
        dtstart: NOW,
        tzid: 'UTC',
        count: 1,
      } as RRuleRecord,
    };

    expect(isSnoozeExpired(snooze)).toBe(false);
  });

  test('returns true when snooze has ended and never recurs again', () => {
    const snooze = {
      duration: 100000000,
      rRule: {
        dtstart: DATE_2019,
        tzid: 'UTC',
        count: 1,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snooze)).toBe(true);
  });

  test('returns false when snooze is indefinite', () => {
    const snooze = {
      duration: -1,
      rRule: {
        dtstart: DATE_1970,
        tzid: 'UTC',
        count: 1,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snooze)).toBe(false);
  });

  test('returns false for an indefinitely recurring snooze', () => {
    const snoozeA = {
      duration: 60 * 1000,
      rRule: {
        dtstart: DATE_2019,
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeA)).toBe(false);

    const snoozeB = {
      duration: 60 * 1000,
      rRule: {
        dtstart: DATE_2019_PLUS_6_HOURS,
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeB)).toBe(false);
    const snoozeC = {
      duration: 60 * 1000,
      rRule: {
        dtstart: DATE_2020_MINUS_1_HOUR,
        tzid: 'UTC',
        freq: Frequency.HOURLY,
        interval: 1,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeC)).toBe(false);
  });

  test('returns as expected for a recurring snooze with limited occurrences', () => {
    const snoozeA = {
      duration: 60 * 1000,
      rRule: {
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
        count: 8761,
        dtstart: DATE_2019,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeA)).toBe(false);
    const snoozeB = {
      duration: 60 * 1000,

      rRule: {
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
        count: 25,
        dtstart: DATE_2019,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeB)).toBe(true);
    const snoozeC = {
      duration: 60 * 1000,

      rRule: {
        freq: Frequency.YEARLY,
        interval: 1,
        tzid: 'UTC',
        count: 30,
        dtstart: DATE_1970,
      } as RRuleRecord,
    };

    expect(isSnoozeExpired(snoozeC)).toBe(true);
  });

  test('returns as expected for a recurring snooze with an end date', () => {
    const snoozeA = {
      duration: 60 * 1000,
      rRule: {
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
        until: DATE_9999,
        dtstart: DATE_2019,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeA)).toBe(false);
    const snoozeB = {
      duration: 60 * 1000,
      rRule: {
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
        until: DATE_2020_MINUS_1_HOUR,
        dtstart: DATE_2019,
      } as RRuleRecord,
    };
    expect(isSnoozeExpired(snoozeB)).toBe(true);
  });
});
