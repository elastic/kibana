/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { RRule } from 'rrule';
import { isRuleSnoozed } from './is_rule_snoozed';
import { RRuleRecord } from '../types';

const DATE_9999 = '9999-12-31T12:34:56.789Z';
const DATE_1970 = '1970-01-01T00:00:00.000Z';
const DATE_2019 = '2019-01-01T00:00:00.000Z';
const DATE_2019_PLUS_6_HOURS = '2019-01-01T06:00:00.000Z';
const DATE_2020 = '2020-01-01T00:00:00.000Z';
const DATE_2020_MINUS_1_HOUR = '2019-12-31T23:00:00.000Z';
const DATE_2020_MINUS_1_MONTH = '2019-12-01T00:00:00.000Z';
const DATE_2020_MINUS_6_HOURS = '2019-12-31T18:00:00.000Z';

const NOW = DATE_2020;

let fakeTimer: sinon.SinonFakeTimers;

describe('isRuleSnoozed', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date(NOW));
  });

  afterAll(() => fakeTimer.restore());

  test('returns false when snooze has not yet started', () => {
    const snoozeSchedule = [
      {
        duration: 100000000,
        rRule: {
          dtstart: DATE_9999,
          tzid: 'UTC',
          count: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: false })).toBe(false);
  });

  test('returns true when snooze has started', () => {
    const snoozeSchedule = [
      {
        duration: 100000000,
        rRule: {
          dtstart: NOW,
          tzid: 'UTC',
          count: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: false })).toBe(true);
  });

  test('returns false when snooze has ended', () => {
    const snoozeSchedule = [
      {
        duration: 100000000,

        rRule: {
          dtstart: DATE_2019,
          tzid: 'UTC',
          count: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: false })).toBe(false);
  });

  test('returns true when snooze is indefinite', () => {
    const snoozeSchedule = [
      {
        duration: -1,
        rRule: {
          dtstart: DATE_9999,
          tzid: 'UTC',
          count: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: true })).toBe(true);
  });

  test('returns as expected for an indefinitely recurring snooze', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          dtstart: DATE_2019,
          tzid: 'UTC',
          freq: RRule.DAILY,
          interval: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,
        rRule: {
          dtstart: DATE_2019_PLUS_6_HOURS,
          tzid: 'UTC',
          freq: RRule.DAILY,
          interval: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
    const snoozeScheduleC = [
      {
        duration: 60 * 1000,
        rRule: {
          dtstart: DATE_2020_MINUS_1_HOUR,
          tzid: 'UTC',
          freq: RRule.HOURLY,
          interval: 1,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(true);
  });

  test('returns as expected for a recurring snooze with limited occurrences', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          count: 8761,
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,

        rRule: {
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          count: 25,
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
    const snoozeScheduleC = [
      {
        duration: 60 * 1000,

        rRule: {
          freq: RRule.YEARLY,
          interval: 1,
          tzid: 'UTC',
          count: 60,
          dtstart: DATE_1970,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(true);
  });

  test('returns as expected for a recurring snooze with an end date', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          until: DATE_9999,
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          until: DATE_2020_MINUS_1_HOUR,
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
  });

  test('returns as expected for a recurring snooze on a day of the week', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: ['MO', 'WE', 'FR'], // Jan 1 2020 was a Wednesday
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: ['TU', 'TH', 'SA', 'SU'],
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
    const snoozeScheduleC = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: ['MO', 'WE', 'FR'],
          count: 12,
          dtstart: DATE_2020_MINUS_1_MONTH,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(false);
    const snoozeScheduleD = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: ['MO', 'WE', 'FR'],
          count: 15,
          dtstart: DATE_2020_MINUS_1_MONTH,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleD, muteAll: false })).toBe(true);
  });

  test('returns as expected for a recurring snooze on an nth day of the week of a month', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.MONTHLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: ['+1WE'], // Jan 1 2020 was the first Wednesday of the month
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.MONTHLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: ['+2WE'],
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
  });

  test('using a timezone, returns as expected for a recurring snooze on a day of the week', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: ['WE'],
          tzid: 'Asia/Taipei',
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];

    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(false);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,
        rRule: {
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: ['WE'],
          byhour: [0],
          byminute: [0],
          tzid: 'UTC',
          dtstart: DATE_2019,
        } as RRuleRecord,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(true);
  });

  test('returns as expected for a manually skipped recurring snooze', () => {
    const snoozeScheduleA = [
      {
        duration: 60 * 1000,
        rRule: {
          dtstart: DATE_2019,
          tzid: 'UTC',
          freq: RRule.DAILY,
          interval: 1,
        } as RRuleRecord,
        skipRecurrences: [DATE_2020],
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(false);
    const snoozeScheduleB = [
      {
        duration: 60 * 1000,
        rRule: {
          dtstart: DATE_2019,
          tzid: 'UTC',
          freq: RRule.DAILY,
          interval: 1,
        } as RRuleRecord,
        skipRecurrences: [DATE_2020_MINUS_1_MONTH],
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(true);
    const snoozeScheduleC = [
      {
        duration: 60 * 1000,
        rRule: {
          dtstart: DATE_2020,
          tzid: 'UTC',
          freq: RRule.DAILY,
          interval: 1,
        } as RRuleRecord,
        skipRecurrences: [DATE_2020],
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(false);
    const snoozeScheduleD = [
      {
        duration: 2 * 60 * 60 * 1000,
        rRule: {
          dtstart: DATE_2020_MINUS_6_HOURS,
          tzid: 'UTC',
          freq: RRule.HOURLY,
          interval: 5,
        } as RRuleRecord,
        skipRecurrences: [DATE_2020_MINUS_1_HOUR],
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleD, muteAll: false })).toBe(false);
  });
});
