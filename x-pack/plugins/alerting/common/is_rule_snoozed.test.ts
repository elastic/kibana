/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
import { isRuleSnoozed } from './is_rule_snoozed';

const LOCAL_OFFSET = moment('2020-01-01T00:00:00.000').format('Z');
const DATE_9999 = '9999-12-31T12:34:56.789' + LOCAL_OFFSET;
const DATE_1970 = '1970-01-01T00:00:00.000' + LOCAL_OFFSET;
const DATE_1970_PLUS_6_HOURS = '1970-01-01T06:00:00.000' + LOCAL_OFFSET;
const DATE_2020 = '2020-01-01T00:00:00.000' + LOCAL_OFFSET;
const DATE_2020_MINUS_1_HOUR = '2019-12-31T23:00:00.000' + LOCAL_OFFSET;
const DATE_2020_MINUS_1_MONTH = '2019-12-01T00:00:00.000' + LOCAL_OFFSET;

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
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule })).toBe(false);
  });

  test('returns true when snooze has started', () => {
    const snoozeSchedule = [
      {
        startTime: NOW,
        duration: 100000000,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule })).toBe(true);
  });

  test('returns false when snooze has ended', () => {
    const snoozeSchedule = [
      {
        startTime: DATE_1970,
        duration: 100000000,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule })).toBe(false);
  });

  test('returns true when snooze is indefinite', () => {
    const snoozeSchedule = [
      {
        startTime: DATE_9999,
        duration: 100000000,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule, snoozeIndefinitely: true })).toBe(true);
  });

  test('returns as expected for an indefinitely recurring snooze', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: '1d',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_1970_PLUS_6_HOURS,
        duration: 60 * 1000,
        repeatInterval: '1d',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB })).toBe(false);
    const snoozeScheduleC = [
      {
        startTime: DATE_2020_MINUS_1_HOUR,
        duration: 60 * 1000,
        repeatInterval: '1h',
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC })).toBe(true);
  });

  test('returns as expected for a recurring snooze with limited occurrences', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: '1h',
        occurrences: 600000,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: '1h',
        occurrences: 25,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB })).toBe(false);

    // FIXME: THIS FAILS due to not compensating for leap years. Also 1M intervals exhibit confusing behavior
    // Either we should add something to compensate for this, or disable the use of M and y, and only allow for explicit day lengths
    //   const snoozeScheduleC = [
    //     {
    //       startTime: DATE_1970,
    //       duration: 60 * 1000,
    //       repeatInterval: '1y',
    //       occurrences: 60,
    //     },
    //   ];
    //   expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC })).toBe(true);
  });

  test('returns as expected for a recurring snooze with an end date', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: '1h',
        repeatEndTime: DATE_9999,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: '1h',
        repeatEndTime: DATE_2020_MINUS_1_HOUR,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB })).toBe(false);
  });

  test('returns as expected for a recurring snooze on a day of the week', () => {
    const snoozeScheduleA = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: 'DOW:135', // Monday Wednesday Friday; Jan 1 2020 was a Wednesday
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleA })).toBe(true);
    const snoozeScheduleB = [
      {
        startTime: DATE_1970,
        duration: 60 * 1000,
        repeatInterval: 'DOW:2467', // Tue, Thu, Sat, Sun
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleB })).toBe(false);
    const snoozeScheduleC = [
      {
        startTime: DATE_2020_MINUS_1_MONTH,
        duration: 60 * 1000,
        repeatInterval: 'DOW:135',
        occurrences: 12,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleC })).toBe(false);
    const snoozeScheduleD = [
      {
        startTime: DATE_2020_MINUS_1_MONTH,
        duration: 60 * 1000,
        repeatInterval: 'DOW:135',
        occurrences: 15,
      },
    ];
    expect(isRuleSnoozed({ snoozeSchedule: snoozeScheduleD })).toBe(true);
  });
});
