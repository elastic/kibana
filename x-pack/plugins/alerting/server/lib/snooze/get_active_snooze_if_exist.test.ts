/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Frequency } from '@kbn/rrule';
import sinon from 'sinon';
import { RRuleRecord } from '../../types';
import { getActiveSnoozeIfExist } from './get_active_snooze_if_exist';

let fakeTimer: sinon.SinonFakeTimers;

describe('getActiveSnoozeIfExist', () => {
  afterAll(() => fakeTimer.restore());

  test('snooze is NOT active byweekday', () => {
    // Set the current time as:
    //   - Feb 27 2023 08:15:00 GMT+0000 - Monday
    fakeTimer = sinon.useFakeTimers(new Date('2023-02-27T08:15:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Feb 24 2023 23:00:00 GMT+0000 - Friday
    //   - End date of: Feb 27 2023 06:00:00 GMT+0000 - Monday
    //     - Which is obtained from start date + 2 days and 7 hours (198000000 ms)
    const snoozeA = {
      duration: 198000000,
      rRule: {
        byweekday: ['SA'],
        tzid: 'Europe/Madrid',
        freq: Frequency.DAILY,
        interval: 1,
        dtstart: '2023-02-24T23:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`null`);
    fakeTimer.restore();
  });

  test('snooze is active byweekday', () => {
    // Set the current time as:
    //   - Feb 25 2023 08:15:00 GMT+0000 - Saturday
    fakeTimer = sinon.useFakeTimers(new Date('2023-02-25T08:15:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Feb 24 2023 23:00:00 GMT+0000 - Friday
    //   - End date of: Feb 27 2023 06:00:00 GMT+0000 - Monday
    //     - Which is obtained from start date + 2 days and 7 hours (198000000 ms)
    const snoozeA = {
      duration: 198000000,
      rRule: {
        byweekday: ['SA'],
        tzid: 'Europe/Madrid',
        freq: Frequency.DAILY,
        interval: 1,
        dtstart: '2023-02-24T23:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`
      Object {
        "id": "9141dc1f-ed85-4656-91e4-119173105432",
        "lastOccurrence": 2023-02-24T23:00:00.000Z,
        "snoozeEndTime": 2023-02-27T06:00:00.000Z,
      }
    `);
    fakeTimer.restore();
  });

  test('snooze is NOT active in recurrence byweekday', () => {
    // Set the current time as:
    //   - March 01 2023 08:15:00 GMT+0000 - Wednesday
    fakeTimer = sinon.useFakeTimers(new Date('2023-03-01T08:15:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Feb 24 2023 23:00:00 GMT+0000 - Friday
    //   - End date of: Feb 27 2023 06:00:00 GMT+0000 - Monday
    //     - Which is obtained from start date + 2 days and 7 hours (198000000 ms)
    const snoozeA = {
      duration: 198000000,
      rRule: {
        byweekday: ['SA'],
        tzid: 'Europe/Madrid',
        freq: Frequency.DAILY,
        interval: 1,
        dtstart: '2023-02-24T23:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`null`);
    fakeTimer.restore();
  });

  test('snooze is active in recurrence byweekday', () => {
    // Set the current time as:
    //   - March 04 2023 08:15:00 GMT+0000 - Saturday
    fakeTimer = sinon.useFakeTimers(new Date('2023-03-04T08:15:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Feb 24 2023 23:00:00 GMT+0000 - Friday
    //   - End date of: Feb 27 2023 06:00:00 GMT+0000 - Monday
    //     - Which is obtained from start date + 2 days and 7 hours (198000000 ms)
    const snoozeA = {
      duration: 198000000,
      rRule: {
        byweekday: ['SA'],
        tzid: 'Europe/Madrid',
        freq: Frequency.DAILY,
        interval: 1,
        dtstart: '2023-02-24T23:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`
      Object {
        "id": "9141dc1f-ed85-4656-91e4-119173105432",
        "lastOccurrence": 2023-03-03T23:00:00.000Z,
        "snoozeEndTime": 2023-03-06T06:00:00.000Z,
      }
    `);
    fakeTimer.restore();
  });

  test('snooze is NOT active bymonth', () => {
    // Set the current time as:
    //   - Feb 27 2023 08:15:00 GMT+0000 - Monday
    fakeTimer = sinon.useFakeTimers(new Date('2023-02-09T08:15:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Jan 01 2023 00:00:00 GMT+0000 - Sunday
    //   - End date of: Jan 31 2023 06:00:00 GMT+0000 - Tuesday
    //     - Which is obtained from start date + 1 month (2629800000 ms)
    const snoozeA = {
      duration: moment('2023-01', 'YYYY-MM').daysInMonth() * 24 * 60 * 60 * 1000, // 1 month
      rRule: {
        freq: Frequency.YEARLY,
        interval: 1,
        bymonthday: [1],
        bymonth: [1],
        tzid: 'Europe/Madrid',
        dtstart: '2023-01-01T00:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`null`);
    fakeTimer.restore();
  });

  test('snooze is active bymonth', () => {
    // Set the current time as:
    //   - Jan 25 2023 08:15:00 GMT+0000 - Saturday
    fakeTimer = sinon.useFakeTimers(new Date('2023-01-25T08:15:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Jan 01 2023 00:00:00 GMT+0000 - Sunday
    //   - End date of: Jan 31 2023 06:00:00 GMT+0000 - Tuesday
    //     - Which is obtained from start date + 1 month (2629800000 ms)
    const snoozeA = {
      duration: moment('2023-01', 'YYYY-MM').daysInMonth() * 24 * 60 * 60 * 1000,
      rRule: {
        bymonthday: [1],
        bymonth: [1],
        tzid: 'Europe/Madrid',
        freq: Frequency.MONTHLY,
        interval: 1,
        dtstart: '2023-01-01T00:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`
      Object {
        "id": "9141dc1f-ed85-4656-91e4-119173105432",
        "lastOccurrence": 2023-01-01T00:00:00.000Z,
        "snoozeEndTime": 2023-02-01T00:00:00.000Z,
      }
    `);
    fakeTimer.restore();
  });

  test('snooze is NOT active bymonth after the first month', () => {
    // Set the current time as:
    //   - Feb 01 2023 00:00:00 GMT+0000 - Wednesday
    fakeTimer = sinon.useFakeTimers(new Date('2023-02-01T00:00:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Jan 01 2023 00:00:00 GMT+0000 - Sunday
    //   - End date of: Jan 31 2023 06:00:00 GMT+0000 - Tuesday
    //     - Which is obtained from start date + 1 month (2629800000 ms)
    const snoozeA = {
      duration: moment('2023-01', 'YYYY-MM').daysInMonth() * 24 * 60 * 60 * 1000,
      rRule: {
        bymonthday: [1],
        bymonth: [1],
        tzid: 'Europe/Madrid',
        freq: Frequency.MONTHLY,
        interval: 1,
        dtstart: '2023-01-01T00:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`null`);
    fakeTimer.restore();
  });

  // THIS is wrong, we need to do the same thing that we did for `byweekday` for
  test('snooze is NOT active bymonth before the first month', () => {
    // Set the current time as:
    //   - Dec 31 2022 23:00:00 GMT+0000 - Wednesday
    fakeTimer = sinon.useFakeTimers(new Date('2022-12-31T21:00:00.000Z'));

    // Try to get snooze end time with:
    //   - Start date of: Jan 01 2023 00:00:00 GMT+0000 - Sunday
    //   - End date of: Jan 31 2023 06:00:00 GMT+0000 - Tuesday
    //     - Which is obtained from start date + 1 month (2629800000 ms)
    const snoozeA = {
      duration: moment('2023-01', 'YYYY-MM').daysInMonth() * 24 * 60 * 60 * 1000,
      rRule: {
        bymonthday: [1],
        bymonth: [1],
        tzid: 'Europe/Madrid',
        freq: Frequency.MONTHLY,
        interval: 1,
        dtstart: '2023-01-01T00:00:00.000Z',
      } as RRuleRecord,
      id: '9141dc1f-ed85-4656-91e4-119173105432',
    };
    expect(getActiveSnoozeIfExist(snoozeA)).toMatchInlineSnapshot(`null`);
    fakeTimer.restore();
  });
});
