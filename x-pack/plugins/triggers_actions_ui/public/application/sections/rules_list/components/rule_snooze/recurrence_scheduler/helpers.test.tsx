/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RRuleFrequency } from '../../../../../../types';
import {
  buildCustomRecurrenceSchedulerState,
  generateNthByweekday,
  getInitialByweekday,
  getWeekdayInfo,
  recurrenceSummary,
  rRuleWeekdayToWeekdayName,
} from './helpers';

describe('Recurrence scheduler helper', () => {
  describe('getWeekdayInfo', () => {
    test('11/23/2021 should be the fourth tuesday of this month (november)', () => {
      expect(getWeekdayInfo(moment('11/23/2021'))).toEqual({
        dayOfWeek: 'Tuesday',
        isLastOfMonth: false,
        nthWeekdayOfMonth: 4,
      });
    });

    test('11/16/2021 should be the third tuesday of this month (november)', () => {
      expect(getWeekdayInfo(moment('11/16/2021'))).toEqual({
        dayOfWeek: 'Tuesday',
        isLastOfMonth: false,
        nthWeekdayOfMonth: 3,
      });
    });

    test('date is the last month for 12/25/2020', () => {
      expect(getWeekdayInfo(moment('12/25/2020'))).toEqual({
        dayOfWeek: 'Friday',
        isLastOfMonth: true,
        nthWeekdayOfMonth: 4,
      });
    });

    test('date === null', () => {
      expect(getWeekdayInfo(moment(null))).toEqual({
        dayOfWeek: 'Invalid date',
        isLastOfMonth: true,
        nthWeekdayOfMonth: NaN,
      });
    });
  });

  describe('getInitialByweekday', () => {
    test('happy path for 11/23/2021', () => {
      expect(getInitialByweekday([], moment('11/23/2021'))).toEqual({
        '1': false,
        '2': true,
        '3': false,
        '4': false,
        '5': false,
        '6': false,
        '7': false,
      });
    });

    test('check sanitization', () => {
      expect(getInitialByweekday(['+2MO', '-1FR'], moment('11/23/2021'))).toEqual({
        '1': true,
        '2': false,
        '3': false,
        '4': false,
        '5': true,
        '6': false,
        '7': false,
      });
    });

    test('date === null', () => {
      expect(getInitialByweekday([], null)).toEqual({
        '1': true,
        '2': false,
        '3': false,
        '4': false,
        '5': false,
        '6': false,
        '7': false,
      });
    });
  });

  describe('generateNthByweekday', () => {
    test('it is the 4th tuesday', () => {
      expect(generateNthByweekday(moment('11/23/2021'))).toEqual(['+4TU']);
    });

    test('it is the 3rd tuesday', () => {
      expect(generateNthByweekday(moment('11/16/2021'))).toEqual(['+3TU']);
    });
  });

  describe('recurrenceSummary', () => {
    test('should give a detailed msg with the until', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          until: moment('11/23/1979'),
          count: 5,
          byweekday: ['+4TU'],
        })
      ).toEqual('every month on the 4th Tuesday until November 23, 1979');
    });

    test('should give a detailed msg with the occurrences', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          count: 5,
          byweekday: ['+4TU'],
        })
      ).toEqual('every month on the 4th Tuesday for 5 occurrences');
    });

    test('should give a detailed msg with the recurrence', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
          byweekday: ['+4TU'],
        })
      ).toEqual('every month on the 4th Tuesday');
    });

    test('should give a basic msg', () => {
      expect(
        recurrenceSummary({
          freq: RRuleFrequency.MONTHLY,
          interval: 1,
        })
      ).toEqual('every month');
    });
  });

  describe('rRuleWeekdayToWeekdayName', () => {
    test('It is Monday', () => {
      expect(rRuleWeekdayToWeekdayName('+2MO')).toEqual('Monday');
    });

    test('it is Tuesday', () => {
      expect(rRuleWeekdayToWeekdayName('+3TU')).toEqual('Tuesday');
    });

    test('it is Friday', () => {
      expect(rRuleWeekdayToWeekdayName('-1FR')).toEqual('Friday');
    });
  });

  describe('buildCustomRecurrenceSchedulerState', () => {
    test('Daily frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.DAILY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [],
        byweekday: [],
        freq: 3,
        interval: 2,
      });
    });

    test('Weekly frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.WEEKLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [],
        byweekday: ['TU'],
        freq: 2,
        interval: 2,
      });
    });

    test('Monthly frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.MONTHLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [23],
        byweekday: [],
        freq: 1,
        interval: 2,
      });
    });

    test('Monthly frequency by weekday ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.MONTHLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'weekday',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [],
        bymonthday: [],
        byweekday: ['+4TU'],
        freq: 1,
        interval: 2,
      });
    });

    test('Yearly frequency ', () => {
      expect(
        buildCustomRecurrenceSchedulerState({
          frequency: RRuleFrequency.YEARLY,
          interval: 2,
          byweekday: {
            '1': false,
            '2': true,
            '3': false,
            '4': false,
            '5': false,
            '6': false,
            '7': false,
          },
          monthlyRecurDay: 'day',
          startDate: moment('11/23/2021'),
        })
      ).toEqual({
        bymonth: [10],
        bymonthday: [23],
        byweekday: [],
        freq: 0,
        interval: 2,
      });
    });
  });
});
