/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { RRuleFrequency } from '../../../../../../types';
import { futureTimeToInterval, durationToTextString, scheduleSummary } from './helpers';

const NOW = '2021-01-01T12:00:00.000Z';
const TEN_MINUTES_FROM_NOW = '2021-01-01T12:10:00.000Z';
const ABOUT_ONE_HOUR_FROM_NOW = '2021-01-01T13:10:00.000Z';
const TWO_DAYS_FROM_NOW = '2021-01-03T10:10:00.000Z';
const SIX_MONTHS_FROM_NOW = '2021-07-03T10:10:00.000Z';
const THIRTY_SIX_MONTHS_FROM_NOW = '2023-07-03T10:10:00.000Z';

describe('Snooze panel helpers', () => {
  let timers: sinon.SinonFakeTimers;

  beforeAll(() => {
    timers = sinon.useFakeTimers(new Date(NOW));
  });
  afterAll(() => {
    timers.restore();
  });

  describe('futureTimeToInterval', () => {
    test('should parse a time several minutes from now', () => {
      expect(futureTimeToInterval(new Date(TEN_MINUTES_FROM_NOW))).toBe('10m');
    });
    test('should parse a time about an hour from now', () => {
      expect(futureTimeToInterval(new Date(ABOUT_ONE_HOUR_FROM_NOW))).toBe('1h');
    });
    test('should parse a time days from now', () => {
      expect(futureTimeToInterval(new Date(TWO_DAYS_FROM_NOW))).toBe('2d');
    });
    test('should parse a time months from now', () => {
      expect(futureTimeToInterval(new Date(SIX_MONTHS_FROM_NOW))).toBe('6M');
    });
    test('should parse a time years from now', () => {
      expect(futureTimeToInterval(new Date(THIRTY_SIX_MONTHS_FROM_NOW))).toBe('36M');
    });
  });

  describe('durationToTextString', () => {
    test('should output 1 hour instead of "an" hour', () => {
      expect(durationToTextString(1, 'h')).toBe('1 hour');
    });

    test('should output 2 days', () => {
      expect(durationToTextString(2, 'd')).toBe('2 days');
    });
  });

  describe('scheduleSummary', () => {
    test('should capitalize the output', () => {
      expect(
        scheduleSummary({
          id: null,
          duration: 864000,
          rRule: {
            dtstart: NOW,
            tzid: 'UTC',
            freq: RRuleFrequency.MONTHLY,
            interval: 1,
            count: 5,
            byweekday: ['+4TU'],
          },
        })
      ).toEqual('Every month on the 4th Tuesday for 5 occurrences');
    });
  });
});
