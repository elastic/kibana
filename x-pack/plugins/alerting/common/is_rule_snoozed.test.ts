/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import { isRuleSnoozed } from './is_rule_snoozed';

const DATE_9999 = '9999-12-31T12:34:56.789Z';
const DATE_1970 = '1970-01-01T00:00:00.000Z';
const DATE_2019 = '2019-01-01T00:00:00.000Z';
const DATE_2019_PLUS_6_HOURS = '2019-01-01T06:00:00.000Z';
const DATE_2020 = '2020-01-01T00:00:00.000Z';
const DATE_2020_MINUS_1_HOUR = '2019-12-31T23:00:00.000Z';
const DATE_2020_MINUS_1_MONTH = '2019-12-01T00:00:00.000Z';

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
        startTime: DATE_9999,
        duration: 100000000,
        timeZone: 'UTC',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: false })).toBe(false);
  });

  test('returns true when snooze has started', () => {
    const snoozeSchedule = [
      {
        startTime: NOW,
        duration: 100000000,
        timeZone: 'UTC',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: false })).toBe(true);
  });

  test('returns false when snooze has ended', () => {
    const snoozeSchedule = [
      {
        startTime: DATE_2019,
        duration: 100000000,
        timeZone: 'UTC',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: false })).toBe(false);
  });

  test('returns true when snooze is indefinite', () => {
    const snoozeSchedule = [
      {
        startTime: DATE_9999,
        duration: 100000000,
        timeZone: 'UTC',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, muteAll: true })).toBe(true);
  });

  test('returns as expected for an indefinitely recurring snooze', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.DAILY,
          interval: 1,
          tzid: 'UTC',
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_2019_PLUS_6_HOURS,
        duration: 60 * 1000,
        rRule: new RRule({
          freq: RRule.DAILY,
          interval: 1,
          tzid: 'UTC',
          dtstart: new Date(DATE_2019_PLUS_6_HOURS),
        }).toString(),
        timeZone: 'UTC',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
    const snoozeScheduleC = [
      {
        startTime: DATE_2020_MINUS_1_HOUR,
        duration: 60 * 1000,
        rRule: new RRule({
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          dtstart: new Date(DATE_2020_MINUS_1_HOUR),
        }).toString(),
        timeZone: 'UTC',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(true);
  });

  test('returns as expected for a recurring snooze with limited occurrences', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          count: 8761,
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          count: 25,
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
    const snoozeScheduleC = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.YEARLY,
          interval: 1,
          tzid: 'UTC',
          count: 60,
          dtstart: new Date(DATE_1970),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(true);
  });

  test('returns as expected for a recurring snooze with an end date', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          until: new Date(DATE_9999),
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.HOURLY,
          interval: 1,
          tzid: 'UTC',
          until: new Date(DATE_2020_MINUS_1_HOUR),
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
  });

  test('returns as expected for a recurring snooze on a day of the week', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: [RRule.MO, RRule.WE, RRule.FR],
          dtstart: new Date(DATE_2019),
        }).toString(), // Monday Wednesday Friday; Jan 1 2020 was a Wednesday
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: [RRule.TU, RRule.TH, RRule.SA, RRule.SU],
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
    const snoozeScheduleC = [
      {
        startTime: DATE_2020_MINUS_1_MONTH,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: [RRule.MO, RRule.WE, RRule.FR],
          count: 12,
          dtstart: new Date(DATE_2020_MINUS_1_MONTH),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC, muteAll: false })).toBe(false);
    const snoozeScheduleD = [
      {
        startTime: DATE_2020_MINUS_1_MONTH,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.WEEKLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: [RRule.MO, RRule.WE, RRule.FR],
          count: 15,
          dtstart: new Date(DATE_2020_MINUS_1_MONTH),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleD, muteAll: false })).toBe(true);
  });

  test('returns as expected for a recurring snooze on an nth day of the week of a month', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.MONTHLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: [RRule.WE.nth(1)], // Jan 1 2020 was the first Wednesday of the month
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.MONTHLY,
          interval: 1,
          tzid: 'UTC',
          byweekday: [RRule.WE.nth(2)],
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(false);
  });

  test('using a timezone, returns as expected for a recurring snooze on a day of the week', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'Asia/Taipei',
        rRule: new RRule({
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: [RRule.WE],
          tzid: 'Asia/Taipei',
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];

    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA, muteAll: false })).toBe(false);
    const snoozeScheduleB = [
      {
        startTime: DATE_2019,
        duration: 60 * 1000,
        timeZone: 'UTC',
        rRule: new RRule({
          freq: RRule.WEEKLY,
          interval: 1,
          byweekday: [RRule.WE],
          byhour: [0],
          byminute: [0],
          tzid: 'UTC',
          dtstart: new Date(DATE_2019),
        }).toString(),
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB, muteAll: false })).toBe(true);
  });
});
