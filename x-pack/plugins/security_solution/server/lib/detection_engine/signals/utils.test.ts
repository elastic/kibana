/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import sinon from 'sinon';

import {
  generateId,
  parseInterval,
  parseScheduleDates,
  getDriftTolerance,
  getGapBetweenRuns,
  errorAggregator,
} from './utils';

import { BulkResponseErrorAggregation } from './types';

import {
  sampleBulkResponse,
  sampleEmptyBulkResponse,
  sampleBulkError,
  sampleBulkErrorItem,
} from './__mocks__/es_results';

describe('utils', () => {
  const anchor = '2020-01-01T06:06:06.666Z';
  const unix = moment(anchor).valueOf();
  let nowDate = moment('2020-01-01T00:00:00.000Z');
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    nowDate = moment('2020-01-01T00:00:00.000Z');
    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('generateId', () => {
    test('it generates expected output', () => {
      const id = generateId('index-123', 'doc-123', 'version-123', 'rule-123');
      expect(id).toEqual('10622e7d06c9e38a532e71fc90e3426c1100001fb617aec8cb974075da52db06');
    });

    test('expected output is a hex', () => {
      const id = generateId('index-123', 'doc-123', 'version-123', 'rule-123');
      expect(id).toMatch(/[a-f0-9]+/);
    });
  });

  describe('parseInterval', () => {
    test('it returns a duration when given one that is valid', () => {
      const duration = parseInterval('5m');
      expect(duration).not.toBeNull();
      expect(duration?.asMilliseconds()).toEqual(moment.duration(5, 'minutes').asMilliseconds());
    });

    test('it returns null given an invalid duration', () => {
      const duration = parseInterval('junk');
      expect(duration).toBeNull();
    });
  });

  describe('parseScheduleDates', () => {
    test('it returns a moment when given an ISO string', () => {
      const result = parseScheduleDates('2020-01-01T00:00:00.000Z');
      expect(result).not.toBeNull();
      expect(result).toEqual(moment('2020-01-01T00:00:00.000Z'));
    });

    test('it returns a moment when given `now`', () => {
      const result = parseScheduleDates('now');

      expect(result).not.toBeNull();
      expect(moment.isMoment(result)).toBeTruthy();
    });

    test('it returns a moment when given `now-x`', () => {
      const result = parseScheduleDates('now-6m');

      expect(result).not.toBeNull();
      expect(moment.isMoment(result)).toBeTruthy();
    });

    test('it returns null when given a string that is not an ISO string, `now` or `now-x`', () => {
      const result = parseScheduleDates('invalid');

      expect(result).toBeNull();
    });
  });

  describe('getDriftTolerance', () => {
    test('it returns a drift tolerance in milliseconds of 1 minute when "from" overlaps "to" by 1 minute and the interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: 'now-6m',
        to: 'now',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('it returns a drift tolerance of 0 when "from" equals the interval', () => {
      const drift = getDriftTolerance({
        from: 'now-5m',
        to: 'now',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift?.asMilliseconds()).toEqual(0);
    });

    test('it returns a drift tolerance of 5 minutes when "from" is 10 minutes but the interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: 'now-10m',
        to: 'now',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(5, 'minutes').asMilliseconds());
    });

    test('it returns a drift tolerance of 10 minutes when "from" is 10 minutes ago and the interval is 0', () => {
      const drift = getDriftTolerance({
        from: 'now-10m',
        to: 'now',
        interval: moment.duration(0, 'milliseconds'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(10, 'minutes').asMilliseconds());
    });

    test('returns a drift tolerance of 1 minute when "from" is invalid and defaults to "now-6m" and interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: 'invalid',
        to: 'now',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('returns a drift tolerance of 1 minute when "from" does not include `now` and defaults to "now-6m" and interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: '10m',
        to: 'now',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('returns a drift tolerance of 4 minutes when "to" is "now-x", from is a valid input and interval is 5 minute', () => {
      const drift = getDriftTolerance({
        from: 'now-10m',
        to: 'now-1m',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(4, 'minutes').asMilliseconds());
    });

    test('it returns expected drift tolerance when "from" is an ISO string', () => {
      const drift = getDriftTolerance({
        from: moment().subtract(10, 'minutes').toISOString(),
        to: 'now',
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(5, 'minutes').asMilliseconds());
    });

    test('it returns expected drift tolerance when "to" is an ISO string', () => {
      const drift = getDriftTolerance({
        from: 'now-6m',
        to: moment().toISOString(),
        interval: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });
  });

  describe('getGapBetweenRuns', () => {
    test('it returns a gap of 0 when "from" and interval match each other and the previous started was from the previous interval time', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(5, 'minutes').toDate(),
        interval: '5m',
        from: 'now-5m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(0);
    });

    test('it returns a negative gap of 1 minute when "from" overlaps to by 1 minute and the previousStartedAt was 5 minutes ago', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(5, 'minutes').toDate(),
        interval: '5m',
        from: 'now-6m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(-1, 'minute').asMilliseconds());
    });

    test('it returns a negative gap of 5 minutes when "from" overlaps to by 1 minute and the previousStartedAt was 5 minutes ago', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(5, 'minutes').toDate(),
        interval: '5m',
        from: 'now-10m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(-5, 'minute').asMilliseconds());
    });

    test('it returns a negative gap of 1 minute when "from" overlaps to by 1 minute and the previousStartedAt was 10 minutes ago and so was the interval', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(10, 'minutes').toDate(),
        interval: '10m',
        from: 'now-11m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(-1, 'minute').asMilliseconds());
    });

    test('it returns a gap of only -30 seconds when the from overlaps with now by 1 minute, the interval is 5 minutes but the previous started is 30 seconds more', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(5, 'minutes').subtract(30, 'seconds').toDate(),
        interval: '5m',
        from: 'now-6m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(-30, 'seconds').asMilliseconds());
    });

    test('it returns an exact 0 gap when the from overlaps with now by 1 minute, the interval is 5 minutes but the previous started is one minute late', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(6, 'minutes').toDate(),
        interval: '5m',
        from: 'now-6m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(0, 'minute').asMilliseconds());
    });

    test('it returns a gap of 30 seconds when the from overlaps with now by 1 minute, the interval is 5 minutes but the previous started is one minute and 30 seconds late', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(6, 'minutes').subtract(30, 'seconds').toDate(),
        interval: '5m',
        from: 'now-6m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(30, 'seconds').asMilliseconds());
    });

    test('it returns a gap of 1 minute when the from overlaps with now by 1 minute, the interval is 5 minutes but the previous started is two minutes late', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(7, 'minutes').toDate(),
        interval: '5m',
        from: 'now-6m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap?.asMilliseconds()).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('it returns null if given a previousStartedAt of null', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: null,
        interval: '5m',
        from: 'now-5m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).toBeNull();
    });

    test('it returns null if the interval is an invalid string such as "invalid"', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().toDate(),
        interval: 'invalid', // if not set to "x" where x is an interval such as 6m
        from: 'now-5m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap).toBeNull();
    });

    test('it returns the expected result when "from" is an invalid string such as "invalid"', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(7, 'minutes').toDate(),
        interval: '5m',
        from: 'invalid',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap?.asMilliseconds()).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('it returns the expected result when "to" is an invalid string such as "invalid"', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(7, 'minutes').toDate(),
        interval: '5m',
        from: 'now-6m',
        to: 'invalid',
        now: nowDate.clone(),
      });
      expect(gap?.asMilliseconds()).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });
  });

  describe('errorAggregator', () => {
    test('it should aggregate with an empty object when given an empty bulk response', () => {
      const empty = sampleEmptyBulkResponse();
      const aggregated = errorAggregator(empty, []);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate with an empty object when given a valid bulk response with no errors', () => {
      const validResponse = sampleBulkResponse();
      const aggregated = errorAggregator(validResponse, []);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate with a single error when given a single error item', () => {
      const singleError = sampleBulkError();
      const aggregated = errorAggregator(singleError, []);
      const expected: BulkResponseErrorAggregation = {
        'Invalid call': {
          count: 1,
          statusCode: 400,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate two errors with a correct count when given the same two error items', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem();
      const item2 = sampleBulkErrorItem();
      twoAggregatedErrors.items = [item1, item2];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Invalid call': {
          count: 2,
          statusCode: 400,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate three errors with a correct count when given the same two error items', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem();
      const item2 = sampleBulkErrorItem();
      const item3 = sampleBulkErrorItem();
      twoAggregatedErrors.items = [item1, item2, item3];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Invalid call': {
          count: 3,
          statusCode: 400,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate two distinct errors with the correct count of 1 for each error type', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      twoAggregatedErrors.items = [item1, item2];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 1,
          statusCode: 400,
        },
        'Bad Network': {
          count: 1,
          statusCode: 500,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate two of the same errors with the correct count of 2 for each error type', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      twoAggregatedErrors.items = [item1, item2, item3, item4];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 2,
          statusCode: 400,
        },
        'Bad Network': {
          count: 2,
          statusCode: 500,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate three of the same errors with the correct count of 2 for each error type', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 2,
          statusCode: 400,
        },
        'Bad Network': {
          count: 2,
          statusCode: 500,
        },
        'Bad Gateway': {
          count: 2,
          statusCode: 502,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it should aggregate a mix of errors with the correct aggregate count of each', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 400, reason: 'Parse Error' });
      const item2 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, []);
      const expected: BulkResponseErrorAggregation = {
        'Parse Error': {
          count: 1,
          statusCode: 400,
        },
        'Bad Network': {
          count: 2,
          statusCode: 500,
        },
        'Bad Gateway': {
          count: 3,
          statusCode: 502,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it will ignore error single codes such as 409', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item2 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, [409]);
      const expected: BulkResponseErrorAggregation = {
        'Bad Network': {
          count: 1,
          statusCode: 500,
        },
        'Bad Gateway': {
          count: 3,
          statusCode: 502,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it will ignore two error codes such as 409 and 502', () => {
      const twoAggregatedErrors = sampleBulkError();
      const item1 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item2 = sampleBulkErrorItem({ status: 409, reason: 'Conflict Error' });
      const item3 = sampleBulkErrorItem({ status: 500, reason: 'Bad Network' });
      const item4 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item5 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      const item6 = sampleBulkErrorItem({ status: 502, reason: 'Bad Gateway' });
      twoAggregatedErrors.items = [item1, item2, item3, item4, item5, item6];
      const aggregated = errorAggregator(twoAggregatedErrors, [409, 502]);
      const expected: BulkResponseErrorAggregation = {
        'Bad Network': {
          count: 1,
          statusCode: 500,
        },
      };
      expect(aggregated).toEqual(expected);
    });

    test('it will return an empty object given valid inputs and status codes to ignore', () => {
      const bulkResponse = sampleBulkResponse();
      const aggregated = errorAggregator(bulkResponse, [409, 502]);
      const expected: BulkResponseErrorAggregation = {};
      expect(aggregated).toEqual(expected);
    });
  });
});
