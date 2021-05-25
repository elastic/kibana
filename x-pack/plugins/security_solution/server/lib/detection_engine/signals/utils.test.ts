/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
import { ApiResponse, Context } from '@elastic/elasticsearch/lib/Transport';

import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import { listMock } from '../../../../../lists/server/mocks';
import { buildRuleMessageFactory } from './rule_messages';
import { ExceptionListClient } from '../../../../../lists/server';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

// @ts-expect-error
moment.suppressDeprecationWarnings = true;

import {
  generateId,
  parseInterval,
  getDriftTolerance,
  getGapBetweenRuns,
  getNumCatchupIntervals,
  errorAggregator,
  getListsClient,
  getRuleRangeTuples,
  getExceptions,
  hasTimestampFields,
  wrapBuildingBlocks,
  generateSignalId,
  createErrorsFromShard,
  createSearchAfterReturnTypeFromResponse,
  createSearchAfterReturnType,
  mergeReturns,
  createTotalHitsFromSearchResult,
  lastValidDate,
  calculateThresholdSignalUuid,
} from './utils';
import { BulkResponseErrorAggregation, SearchAfterAndBulkCreateReturnType } from './types';
import {
  sampleBulkResponse,
  sampleEmptyBulkResponse,
  sampleBulkError,
  sampleBulkErrorItem,
  mockLogger,
  sampleSignalHit,
  sampleDocSearchResultsWithSortId,
  sampleEmptyDocSearchResults,
  sampleDocSearchResultsNoSortIdNoHits,
  repeatedSearchResultsWithSortId,
  sampleDocSearchResultsNoSortId,
} from './__mocks__/es_results';
import { ShardError } from '../../types';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});

const ruleStatusServiceMock = {
  success: jest.fn(),
  find: jest.fn(),
  goingToRun: jest.fn(),
  error: jest.fn(),
  partialFailure: jest.fn(),
};

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
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
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

    test('it throws given an invalid duration', () => {
      const duration = parseInterval('junk');
      expect(duration).toBeNull();
    });
  });

  describe('getDriftTolerance', () => {
    test('it returns a drift tolerance in milliseconds of 1 minute when "from" overlaps "to" by 1 minute and the interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: 'now-6m',
        to: 'now',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('it returns a drift tolerance of 0 when "from" equals the interval', () => {
      const drift = getDriftTolerance({
        from: 'now-5m',
        to: 'now',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift?.asMilliseconds()).toEqual(0);
    });

    test('it returns a drift tolerance of 5 minutes when "from" is 10 minutes but the interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: 'now-10m',
        to: 'now',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(5, 'minutes').asMilliseconds());
    });

    test('it returns a drift tolerance of 10 minutes when "from" is 10 minutes ago and the interval is 0', () => {
      const drift = getDriftTolerance({
        from: 'now-10m',
        to: 'now',
        intervalDuration: moment.duration(0, 'milliseconds'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(10, 'minutes').asMilliseconds());
    });

    test('returns a drift tolerance of 1 minute when "from" is invalid and defaults to "now-6m" and interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: 'invalid',
        to: 'now',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('returns a drift tolerance of 1 minute when "from" does not include `now` and defaults to "now-6m" and interval is 5 minutes', () => {
      const drift = getDriftTolerance({
        from: '10m',
        to: 'now',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('returns a drift tolerance of 4 minutes when "to" is "now-x", from is a valid input and interval is 5 minute', () => {
      const drift = getDriftTolerance({
        from: 'now-10m',
        to: 'now-1m',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(4, 'minutes').asMilliseconds());
    });

    test('it returns expected drift tolerance when "from" is an ISO string', () => {
      const drift = getDriftTolerance({
        from: moment().subtract(10, 'minutes').toISOString(),
        to: 'now',
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(5, 'minutes').asMilliseconds());
    });

    test('it returns expected drift tolerance when "to" is an ISO string', () => {
      const drift = getDriftTolerance({
        from: 'now-6m',
        to: moment().toISOString(),
        intervalDuration: moment.duration(5, 'minutes'),
      });
      expect(drift).not.toBeNull();
      expect(drift?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });
  });

  describe('getGapBetweenRuns', () => {
    test('it returns a gap of 0 when "from" and interval match each other and the previous started was from the previous interval time', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(5, 'minutes').toDate(),
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(10, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
        from: 'now-6m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap?.asMilliseconds()).not.toBeNull();
      expect(gap?.asMilliseconds()).toEqual(moment.duration(1, 'minute').asMilliseconds());
    });

    test('it returns 0 if given a previousStartedAt of null', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: null,
        intervalDuration: moment.duration(5, 'minutes'),
        from: 'now-5m',
        to: 'now',
        now: nowDate.clone(),
      });
      expect(gap.asMilliseconds()).toEqual(0);
    });

    test('it returns the expected result when "from" is an invalid string such as "invalid"', () => {
      const gap = getGapBetweenRuns({
        previousStartedAt: nowDate.clone().subtract(7, 'minutes').toDate(),
        intervalDuration: moment.duration(5, 'minutes'),
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
        intervalDuration: moment.duration(5, 'minutes'),
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

    test('it should aggregate with an empty create object', () => {
      const empty = sampleBulkResponse();
      empty.items = [{}];
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

  describe('#getListsClient', () => {
    let alertServices: AlertServicesMock;

    beforeEach(() => {
      alertServices = alertsMock.createAlertServices();
    });

    test('it successfully returns list and exceptions list client', async () => {
      const { listClient, exceptionsClient } = getListsClient({
        services: alertServices,
        savedObjectClient: alertServices.savedObjectsClient,
        updatedByUser: 'some_user',
        spaceId: '',
        lists: listMock.createSetup(),
      });

      expect(listClient).toBeDefined();
      expect(exceptionsClient).toBeDefined();
    });
  });

  describe('getRuleRangeTuples', () => {
    test('should return a single tuple if no gap', () => {
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger: mockLogger,
        previousStartedAt: moment().subtract(30, 's').toDate(),
        interval: '30s',
        from: 'now-30s',
        to: 'now',
        maxSignals: 20,
        buildRuleMessage,
      });
      const someTuple = tuples[0];
      expect(moment(someTuple.to).diff(moment(someTuple.from), 's')).toEqual(30);
      expect(tuples.length).toEqual(1);
      expect(remainingGap.asMilliseconds()).toEqual(0);
    });

    test('should return a single tuple if malformed interval prevents gap calculation', () => {
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger: mockLogger,
        previousStartedAt: moment().subtract(30, 's').toDate(),
        interval: 'invalid',
        from: 'now-30s',
        to: 'now',
        maxSignals: 20,
        buildRuleMessage,
      });
      const someTuple = tuples[0];
      expect(moment(someTuple.to).diff(moment(someTuple.from), 's')).toEqual(30);
      expect(tuples.length).toEqual(1);
      expect(remainingGap.asMilliseconds()).toEqual(0);
    });

    test('should return two tuples if gap and previouslyStartedAt', () => {
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger: mockLogger,
        previousStartedAt: moment().subtract(65, 's').toDate(),
        interval: '50s',
        from: 'now-55s',
        to: 'now',
        maxSignals: 20,
        buildRuleMessage,
      });
      const someTuple = tuples[1];
      expect(moment(someTuple.to).diff(moment(someTuple.from), 's')).toEqual(55);
      expect(remainingGap.asMilliseconds()).toEqual(0);
    });

    test('should return five tuples when give long gap', () => {
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger: mockLogger,
        previousStartedAt: moment().subtract(65, 's').toDate(), // 64 is 5 times the interval + lookback, which will trigger max lookback
        interval: '10s',
        from: 'now-13s',
        to: 'now',
        maxSignals: 20,
        buildRuleMessage,
      });
      expect(tuples.length).toEqual(5);
      tuples.forEach((item, index) => {
        if (index === 0) {
          return;
        }
        expect(moment(item.to).diff(moment(item.from), 's')).toEqual(13);
        expect(item.to.diff(tuples[index - 1].to, 's')).toEqual(10);
        expect(item.from.diff(tuples[index - 1].from, 's')).toEqual(10);
      });
      expect(remainingGap.asMilliseconds()).toEqual(12000);
    });

    test('should return a single tuple when give a negative gap (rule ran sooner than expected)', () => {
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger: mockLogger,
        previousStartedAt: moment().subtract(-15, 's').toDate(),
        interval: '10s',
        from: 'now-13s',
        to: 'now',
        maxSignals: 20,
        buildRuleMessage,
      });
      expect(tuples.length).toEqual(1);
      const someTuple = tuples[0];
      expect(moment(someTuple.to).diff(moment(someTuple.from), 's')).toEqual(13);
      expect(remainingGap.asMilliseconds()).toEqual(0);
    });
  });

  describe('getMaxCatchupRatio', () => {
    test('should return 0 if gap is 0', () => {
      const catchup = getNumCatchupIntervals({
        gap: moment.duration(0),
        intervalDuration: moment.duration(11000),
      });
      expect(catchup).toEqual(0);
    });

    test('should return 1 if gap is in (0, intervalDuration]', () => {
      const catchup = getNumCatchupIntervals({
        gap: moment.duration(10000),
        intervalDuration: moment.duration(10000),
      });
      expect(catchup).toEqual(1);
    });

    test('should round up return value', () => {
      const catchup = getNumCatchupIntervals({
        gap: moment.duration(15000),
        intervalDuration: moment.duration(11000),
      });
      expect(catchup).toEqual(2);
    });
  });

  describe('#getExceptions', () => {
    test('it successfully returns array of exception list items', async () => {
      listMock.getExceptionListClient = () =>
        (({
          findExceptionListsItem: jest.fn().mockResolvedValue({
            data: [getExceptionListItemSchemaMock()],
            page: 1,
            per_page: 10000,
            total: 1,
          }),
        } as unknown) as ExceptionListClient);
      const client = listMock.getExceptionListClient();
      const exceptions = await getExceptions({
        client,
        lists: getListArrayMock(),
      });

      expect(client.findExceptionListsItem).toHaveBeenCalledWith({
        listId: ['list_id_single', 'endpoint_list'],
        namespaceType: ['single', 'agnostic'],
        page: 1,
        perPage: 10000,
        filter: [],
        sortOrder: undefined,
        sortField: undefined,
      });
      expect(exceptions).toEqual([getExceptionListItemSchemaMock()]);
    });

    test('it throws if "getExceptionListClient" fails', async () => {
      const err = new Error('error fetching list');
      listMock.getExceptionListClient = () =>
        (({
          getExceptionList: jest.fn().mockRejectedValue(err),
        } as unknown) as ExceptionListClient);

      await expect(() =>
        getExceptions({
          client: listMock.getExceptionListClient(),
          lists: getListArrayMock(),
        })
      ).rejects.toThrowError('unable to fetch exception list items');
    });

    test('it throws if "findExceptionListsItem" fails', async () => {
      const err = new Error('error fetching list');
      listMock.getExceptionListClient = () =>
        (({
          findExceptionListsItem: jest.fn().mockRejectedValue(err),
        } as unknown) as ExceptionListClient);

      await expect(() =>
        getExceptions({
          client: listMock.getExceptionListClient(),
          lists: getListArrayMock(),
        })
      ).rejects.toThrowError('unable to fetch exception list items');
    });

    test('it returns empty array if "findExceptionListsItem" returns null', async () => {
      listMock.getExceptionListClient = () =>
        (({
          findExceptionListsItem: jest.fn().mockResolvedValue(null),
        } as unknown) as ExceptionListClient);

      const exceptions = await getExceptions({
        client: listMock.getExceptionListClient(),
        lists: [],
      });

      expect(exceptions).toEqual([]);
    });
  });

  describe('hasTimestampFields', () => {
    test('returns true when missing timestamp override field', async () => {
      const timestampField = 'event.ingested';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timestampFieldCapsResponse: Partial<ApiResponse<Record<string, any>, Context>> = {
        body: {
          indices: ['myfakeindex-1', 'myfakeindex-2', 'myfakeindex-3', 'myfakeindex-4'],
          fields: {
            [timestampField]: {
              date: {
                type: 'date',
                searchable: true,
                aggregatable: true,
                indices: ['myfakeindex-3', 'myfakeindex-4'],
              },
              unmapped: {
                type: 'unmapped',
                searchable: false,
                aggregatable: false,
                indices: ['myfakeindex-1', 'myfakeindex-2'],
              },
            },
          },
        },
      };
      mockLogger.error.mockClear();
      const res = await hasTimestampFields(
        false,
        timestampField,
        'myfakerulename',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestampFieldCapsResponse as ApiResponse<Record<string, any>>,
        ['myfa*'],
        ruleStatusServiceMock,
        mockLogger,
        buildRuleMessage
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'The following indices are missing the timestamp override field "event.ingested": ["myfakeindex-1","myfakeindex-2"] name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
      );
      expect(res).toBeTruthy();
    });
    test('returns true when missing timestamp field', async () => {
      const timestampField = '@timestamp';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timestampFieldCapsResponse: Partial<ApiResponse<Record<string, any>, Context>> = {
        body: {
          indices: ['myfakeindex-1', 'myfakeindex-2', 'myfakeindex-3', 'myfakeindex-4'],
          fields: {
            [timestampField]: {
              date: {
                type: 'date',
                searchable: true,
                aggregatable: true,
                indices: ['myfakeindex-3', 'myfakeindex-4'],
              },
              unmapped: {
                type: 'unmapped',
                searchable: false,
                aggregatable: false,
                indices: ['myfakeindex-1', 'myfakeindex-2'],
              },
            },
          },
        },
      };
      mockLogger.error.mockClear();
      const res = await hasTimestampFields(
        false,
        timestampField,
        'myfakerulename',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestampFieldCapsResponse as ApiResponse<Record<string, any>>,
        ['myfa*'],
        ruleStatusServiceMock,
        mockLogger,
        buildRuleMessage
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'The following indices are missing the timestamp field "@timestamp": ["myfakeindex-1","myfakeindex-2"] name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
      );
      expect(res).toBeTruthy();
    });

    test('returns true when missing logs-endpoint.alerts-* index and rule name is Endpoint Security', async () => {
      const timestampField = '@timestamp';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timestampFieldCapsResponse: Partial<ApiResponse<Record<string, any>, Context>> = {
        body: {
          indices: [],
          fields: {},
        },
      };
      mockLogger.error.mockClear();
      const res = await hasTimestampFields(
        false,
        timestampField,
        'Endpoint Security',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestampFieldCapsResponse as ApiResponse<Record<string, any>>,
        ['logs-endpoint.alerts-*'],
        ruleStatusServiceMock,
        mockLogger,
        buildRuleMessage
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ["logs-endpoint.alerts-*"] was found. This warning will continue to appear until a matching index is created or this rule is de-activated. If you have recently enrolled agents enabled with Endpoint Security through Fleet, this warning should stop once an alert is sent from an agent. name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
      );
      expect(res).toBeTruthy();
    });

    test('returns true when missing logs-endpoint.alerts-* index and rule name is NOT Endpoint Security', async () => {
      const timestampField = '@timestamp';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const timestampFieldCapsResponse: Partial<ApiResponse<Record<string, any>, Context>> = {
        body: {
          indices: [],
          fields: {},
        },
      };
      mockLogger.error.mockClear();
      const res = await hasTimestampFields(
        false,
        timestampField,
        'NOT Endpoint Security',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestampFieldCapsResponse as ApiResponse<Record<string, any>>,
        ['logs-endpoint.alerts-*'],
        ruleStatusServiceMock,
        mockLogger,
        buildRuleMessage
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'This rule is attempting to query data from Elasticsearch indices listed in the "Index pattern" section of the rule definition, however no index matching: ["logs-endpoint.alerts-*"] was found. This warning will continue to appear until a matching index is created or this rule is de-activated. name: "fake name" id: "fake id" rule id: "fake rule id" signals index: "fakeindex"'
      );
      expect(res).toBeTruthy();
    });
  });

  describe('wrapBuildingBlocks', () => {
    it('should generate a unique id for each building block', () => {
      const wrappedBlocks = wrapBuildingBlocks(
        [sampleSignalHit(), sampleSignalHit()],
        'test-index'
      );
      const blockIds: string[] = [];
      wrappedBlocks.forEach((block) => {
        expect(blockIds.includes(block._id)).toEqual(false);
        blockIds.push(block._id);
      });
    });

    it('should generate different ids for identical documents in different sequences', () => {
      const wrappedBlockSequence1 = wrapBuildingBlocks([sampleSignalHit()], 'test-index');
      const wrappedBlockSequence2 = wrapBuildingBlocks(
        [sampleSignalHit(), sampleSignalHit()],
        'test-index'
      );
      const blockId = wrappedBlockSequence1[0]._id;
      wrappedBlockSequence2.forEach((block) => {
        expect(block._id).not.toEqual(blockId);
      });
    });

    it('should generate the same ids when given the same sequence twice', () => {
      const wrappedBlockSequence1 = wrapBuildingBlocks(
        [sampleSignalHit(), sampleSignalHit()],
        'test-index'
      );
      const wrappedBlockSequence2 = wrapBuildingBlocks(
        [sampleSignalHit(), sampleSignalHit()],
        'test-index'
      );
      wrappedBlockSequence1.forEach((block, idx) => {
        expect(block._id).toEqual(wrappedBlockSequence2[idx]._id);
      });
    });
  });

  describe('generateSignalId', () => {
    it('generates a unique signal id for same signal with different rule id', () => {
      const signalId1 = generateSignalId(sampleSignalHit().signal);
      const modifiedSignal = sampleSignalHit();
      modifiedSignal.signal.rule.id = 'some other rule id';
      const signalIdModified = generateSignalId(modifiedSignal.signal);
      expect(signalId1).not.toEqual(signalIdModified);
    });
  });

  describe('createErrorsFromShard', () => {
    test('empty errors will return an empty array', () => {
      const createdErrors = createErrorsFromShard({ errors: [] });
      expect(createdErrors).toEqual([]);
    });

    test('single error will return single converted array of a string of a reason', () => {
      const errors: ShardError[] = [
        {
          shard: 1,
          index: 'index-123',
          node: 'node-123',
          reason: {
            type: 'some type',
            reason: 'some reason',
            index_uuid: 'uuid-123',
            index: 'index-123',
            caused_by: {
              type: 'some type',
              reason: 'some reason',
            },
          },
        },
      ];
      const createdErrors = createErrorsFromShard({ errors });
      expect(createdErrors).toEqual([
        'index: "index-123" reason: "some reason" type: "some type" caused by reason: "some reason" caused by type: "some type"',
      ]);
    });

    test('two errors will return two converted arrays to a string of a reason', () => {
      const errors: ShardError[] = [
        {
          shard: 1,
          index: 'index-123',
          node: 'node-123',
          reason: {
            type: 'some type',
            reason: 'some reason',
            index_uuid: 'uuid-123',
            index: 'index-123',
            caused_by: {
              type: 'some type',
              reason: 'some reason',
            },
          },
        },
        {
          shard: 2,
          index: 'index-345',
          node: 'node-345',
          reason: {
            type: 'some type 2',
            reason: 'some reason 2',
            index_uuid: 'uuid-345',
            index: 'index-345',
            caused_by: {
              type: 'some type 2',
              reason: 'some reason 2',
            },
          },
        },
      ];
      const createdErrors = createErrorsFromShard({ errors });
      expect(createdErrors).toEqual([
        'index: "index-123" reason: "some reason" type: "some type" caused by reason: "some reason" caused by type: "some type"',
        'index: "index-345" reason: "some reason 2" type: "some type 2" caused by reason: "some reason 2" caused by type: "some type 2"',
      ]);
    });

    test('You can have missing values for the shard errors and get the expected output of an empty string', () => {
      const errors: ShardError[] = [
        {
          shard: 1,
          index: 'index-123',
          node: 'node-123',
          reason: {},
        },
      ];
      const createdErrors = createErrorsFromShard({ errors });
      expect(createdErrors).toEqual(['index: "index-123"']);
    });

    test('You can have a single value for the shard errors and get expected output without extra spaces anywhere', () => {
      const errors: ShardError[] = [
        {
          shard: 1,
          index: 'index-123',
          node: 'node-123',
          reason: {
            reason: 'some reason something went wrong',
          },
        },
      ];
      const createdErrors = createErrorsFromShard({ errors });
      expect(createdErrors).toEqual([
        'index: "index-123" reason: "some reason something went wrong"',
      ]);
    });

    test('You can have two values for the shard errors and get expected output with one space exactly between the two values', () => {
      const errors: ShardError[] = [
        {
          shard: 1,
          index: 'index-123',
          node: 'node-123',
          reason: {
            reason: 'some reason something went wrong',
            caused_by: { type: 'some type' },
          },
        },
      ];
      const createdErrors = createErrorsFromShard({ errors });
      expect(createdErrors).toEqual([
        'index: "index-123" reason: "some reason something went wrong" caused by type: "some type"',
      ]);
    });
  });

  describe('createSearchAfterReturnTypeFromResponse', () => {
    test('empty results will return successful type', () => {
      const searchResult = sampleEmptyDocSearchResults();
      const newSearchResult = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        errors: [],
        lastLookBackDate: null,
        searchAfterTimes: [],
        success: true,
        warning: false,
      };
      expect(newSearchResult).toEqual(expected);
    });

    test('multiple results will return successful type with expected success', () => {
      const searchResult = sampleDocSearchResultsWithSortId();
      const newSearchResult = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        errors: [],
        lastLookBackDate: new Date('2020-04-20T21:27:45.000Z'),
        searchAfterTimes: [],
        success: true,
        warning: false,
      };
      expect(newSearchResult).toEqual(expected);
    });

    test('result with error will create success: false within the result set', () => {
      const searchResult = sampleDocSearchResultsNoSortIdNoHits();
      searchResult._shards.failed = 1;
      // @ts-expect-error not full interface
      searchResult._shards.failures = [{ reason: { reason: 'Not a sort failure' } }];
      const { success } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(success).toEqual(false);
    });

    test('result with error will create success: false within the result set if failed is 2 or more', () => {
      const searchResult = sampleDocSearchResultsNoSortIdNoHits();
      searchResult._shards.failed = 2;
      // @ts-expect-error not full interface
      searchResult._shards.failures = [{ reason: { reason: 'Not a sort failure' } }];
      const { success } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(success).toEqual(false);
    });

    test('result with error will create success: false within the result set if mixed reasons for shard failures', () => {
      const searchResult = sampleDocSearchResultsNoSortIdNoHits();
      searchResult._shards.failed = 2;
      searchResult._shards.failures = [
        // @ts-expect-error not full interface
        { reason: { reason: 'Not a sort failure' } },
        // @ts-expect-error not full interface
        { reason: { reason: 'No mapping found for [@timestamp] in order to sort on' } },
      ];
      const { success } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(success).toEqual(false);
    });

    test('result with error will create success: true within the result set if failed is 0', () => {
      const searchResult = sampleDocSearchResultsNoSortIdNoHits();
      searchResult._shards.failed = 0;
      const { success } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(success).toEqual(true);
    });

    test('result with error will create success: true within the result set if shard failure reasons are sorting on timestamp field', () => {
      const searchResult = sampleDocSearchResultsNoSortIdNoHits();
      searchResult._shards.failed = 2;
      searchResult._shards.failures = [
        // @ts-expect-error not full interface
        { reason: { reason: 'No mapping found for [event.ingested] in order to sort on' } },
        // @ts-expect-error not full interface
        { reason: { reason: 'No mapping found for [@timestamp] in order to sort on' } },
      ];
      const { success } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: 'event.ingested',
      });
      expect(success).toEqual(true);
    });

    test('It will not set an invalid date time stamp from a non-existent @timestamp when the index is not 100% ECS compliant', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      // @ts-expect-error @elastic/elasticsearch _source is optional
      (searchResult.hits.hits[0]._source['@timestamp'] as unknown) = undefined;
      if (searchResult.hits.hits[0].fields != null) {
        (searchResult.hits.hits[0].fields['@timestamp'] as unknown) = undefined;
      }
      const { lastLookBackDate } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(lastLookBackDate).toEqual(null);
    });

    test('It will not set an invalid date time stamp from a null @timestamp when the index is not 100% ECS compliant', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      // @ts-expect-error @elastic/elasticsearch _source is optional
      (searchResult.hits.hits[0]._source['@timestamp'] as unknown) = null;
      if (searchResult.hits.hits[0].fields != null) {
        (searchResult.hits.hits[0].fields['@timestamp'] as unknown) = null;
      }
      const { lastLookBackDate } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(lastLookBackDate).toEqual(null);
    });

    test('It will not set an invalid date time stamp from an invalid @timestamp string', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      // @ts-expect-error @elastic/elasticsearch _source is optional
      (searchResult.hits.hits[0]._source['@timestamp'] as unknown) = 'invalid';
      if (searchResult.hits.hits[0].fields != null) {
        (searchResult.hits.hits[0].fields['@timestamp'] as unknown) = ['invalid'];
      }
      const { lastLookBackDate } = createSearchAfterReturnTypeFromResponse({
        searchResult,
        timestampOverride: undefined,
      });
      expect(lastLookBackDate).toEqual(null);
    });
  });

  describe('lastValidDate', () => {
    test('It returns undefined if the search result contains a null timestamp', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      // @ts-expect-error @elastic/elasticsearch _source is optional
      (searchResult.hits.hits[0]._source['@timestamp'] as unknown) = null;
      if (searchResult.hits.hits[0].fields != null) {
        (searchResult.hits.hits[0].fields['@timestamp'] as unknown) = null;
      }
      const date = lastValidDate({ searchResult, timestampOverride: undefined });
      expect(date).toEqual(undefined);
    });

    test('It returns undefined if the search result contains a undefined timestamp', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      // @ts-expect-error @elastic/elasticsearch _source is optional
      (searchResult.hits.hits[0]._source['@timestamp'] as unknown) = undefined;
      if (searchResult.hits.hits[0].fields != null) {
        (searchResult.hits.hits[0].fields['@timestamp'] as unknown) = undefined;
      }
      const date = lastValidDate({ searchResult, timestampOverride: undefined });
      expect(date).toEqual(undefined);
    });

    test('It returns undefined if the search result contains an invalid string value', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      // @ts-expect-error @elastic/elasticsearch _source is optional
      (searchResult.hits.hits[0]._source['@timestamp'] as unknown) = 'invalid value';
      if (searchResult.hits.hits[0].fields != null) {
        (searchResult.hits.hits[0].fields['@timestamp'] as unknown) = ['invalid value'];
      }
      const date = lastValidDate({ searchResult, timestampOverride: undefined });
      expect(date).toEqual(undefined);
    });

    test('It returns normal date time if set', () => {
      const searchResult = sampleDocSearchResultsNoSortId();
      const date = lastValidDate({ searchResult, timestampOverride: undefined });
      expect(date?.toISOString()).toEqual('2020-04-20T21:27:45.000Z');
    });

    test('It returns date time from field if set there', () => {
      const timestamp = '2020-10-07T19:27:19.136Z';
      const searchResult = sampleDocSearchResultsNoSortId();
      if (searchResult.hits.hits[0] == null) {
        throw new TypeError('Test requires one element');
      }
      searchResult.hits.hits[0] = {
        ...searchResult.hits.hits[0],
        fields: {
          '@timestamp': [timestamp],
        },
      };
      const date = lastValidDate({ searchResult, timestampOverride: undefined });
      expect(date?.toISOString()).toEqual(timestamp);
    });

    test('It returns timestampOverride date time if set', () => {
      const override = '2020-10-07T19:20:28.049Z';
      const searchResult = sampleDocSearchResultsNoSortId();
      searchResult.hits.hits[0]._source!.different_timestamp = new Date(override).toISOString();
      const date = lastValidDate({ searchResult, timestampOverride: 'different_timestamp' });
      expect(date?.toISOString()).toEqual(override);
    });

    test('It returns timestampOverride date time from fields if set on it', () => {
      const override = '2020-10-07T19:36:31.110Z';
      const searchResult = sampleDocSearchResultsNoSortId();
      if (searchResult.hits.hits[0] == null) {
        throw new TypeError('Test requires one element');
      }
      searchResult.hits.hits[0] = {
        ...searchResult.hits.hits[0],
        fields: {
          different_timestamp: [override],
        },
      };
      const date = lastValidDate({ searchResult, timestampOverride: 'different_timestamp' });
      expect(date?.toISOString()).toEqual(override);
    });
  });

  describe('createSearchAfterReturnType', () => {
    test('createSearchAfterReturnType will return full object when nothing is passed', () => {
      const searchAfterReturnType = createSearchAfterReturnType();
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        errors: [],
        lastLookBackDate: null,
        searchAfterTimes: [],
        success: true,
        warning: false,
      };
      expect(searchAfterReturnType).toEqual(expected);
    });

    test('createSearchAfterReturnType can override all values', () => {
      const searchAfterReturnType = createSearchAfterReturnType({
        bulkCreateTimes: ['123'],
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: ['error 1'],
        lastLookBackDate: new Date('2020-09-21T18:51:25.193Z'),
        searchAfterTimes: ['123'],
        success: false,
        warning: true,
      });
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: ['123'],
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: ['error 1'],
        lastLookBackDate: new Date('2020-09-21T18:51:25.193Z'),
        searchAfterTimes: ['123'],
        success: false,
        warning: true,
      };
      expect(searchAfterReturnType).toEqual(expected);
    });

    test('createSearchAfterReturnType can override select values', () => {
      const searchAfterReturnType = createSearchAfterReturnType({
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: ['error 1'],
      });
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: [],
        createdSignalsCount: 5,
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: ['error 1'],
        lastLookBackDate: null,
        searchAfterTimes: [],
        success: true,
        warning: false,
      };
      expect(searchAfterReturnType).toEqual(expected);
    });
  });

  describe('mergeReturns', () => {
    test('it merges a default "prev" and "next" correctly ', () => {
      const merged = mergeReturns([createSearchAfterReturnType(), createSearchAfterReturnType()]);
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: [],
        createdSignalsCount: 0,
        createdSignals: [],
        errors: [],
        lastLookBackDate: null,
        searchAfterTimes: [],
        success: true,
        warning: false,
      };
      expect(merged).toEqual(expected);
    });

    test('it merges search in with two default search results where "prev" "success" is false correctly', () => {
      const { success } = mergeReturns([
        createSearchAfterReturnType({ success: false }),
        createSearchAfterReturnType(),
      ]);
      expect(success).toEqual(false);
    });

    test('it merges search in with two default search results where "next" "success" is false correctly', () => {
      const { success } = mergeReturns([
        createSearchAfterReturnType(),
        createSearchAfterReturnType({ success: false }),
      ]);
      expect(success).toEqual(false);
    });

    test('it merges search where the lastLookBackDate is the "next" date when given', () => {
      const { lastLookBackDate } = mergeReturns([
        createSearchAfterReturnType({
          lastLookBackDate: new Date('2020-08-21T19:21:46.194Z'),
        }),
        createSearchAfterReturnType({
          lastLookBackDate: new Date('2020-09-21T19:21:46.194Z'),
        }),
      ]);
      expect(lastLookBackDate).toEqual(new Date('2020-09-21T19:21:46.194Z'));
    });

    test('it merges search where the lastLookBackDate is the "prev" if given undefined for "next', () => {
      const { lastLookBackDate } = mergeReturns([
        createSearchAfterReturnType({
          lastLookBackDate: new Date('2020-08-21T19:21:46.194Z'),
        }),
        createSearchAfterReturnType({
          lastLookBackDate: undefined,
        }),
      ]);
      expect(lastLookBackDate).toEqual(new Date('2020-08-21T19:21:46.194Z'));
    });

    test('it merges search where values from "next" and "prev" are computed together', () => {
      const merged = mergeReturns([
        createSearchAfterReturnType({
          bulkCreateTimes: ['123'],
          createdSignalsCount: 3,
          createdSignals: Array(3).fill(sampleSignalHit()),
          errors: ['error 1', 'error 2'],
          lastLookBackDate: new Date('2020-08-21T18:51:25.193Z'),
          searchAfterTimes: ['123'],
          success: true,
        }),
        createSearchAfterReturnType({
          bulkCreateTimes: ['456'],
          createdSignalsCount: 2,
          createdSignals: Array(2).fill(sampleSignalHit()),
          errors: ['error 3'],
          lastLookBackDate: new Date('2020-09-21T18:51:25.193Z'),
          searchAfterTimes: ['567'],
          success: true,
        }),
      ]);
      const expected: SearchAfterAndBulkCreateReturnType = {
        bulkCreateTimes: ['123', '456'], // concatenates the prev and next together
        createdSignalsCount: 5, // Adds the 3 and 2 together
        createdSignals: Array(5).fill(sampleSignalHit()),
        errors: ['error 1', 'error 2', 'error 3'], // concatenates the prev and next together
        lastLookBackDate: new Date('2020-09-21T18:51:25.193Z'), // takes the next lastLookBackDate
        searchAfterTimes: ['123', '567'], // concatenates the searchAfterTimes together
        success: true, // Defaults to success true is all of it was successful
        warning: false,
      };
      expect(merged).toEqual(expected);
    });
  });

  describe('createTotalHitsFromSearchResult', () => {
    test('it should return 0 for empty results', () => {
      const result = createTotalHitsFromSearchResult({
        searchResult: sampleEmptyDocSearchResults(),
      });
      expect(result).toEqual(0);
    });

    test('it should return 4 for 4 result sets', () => {
      const result = createTotalHitsFromSearchResult({
        searchResult: repeatedSearchResultsWithSortId(4, 1, ['1', '2', '3', '4']),
      });
      expect(result).toEqual(4);
    });
  });

  describe('calculateThresholdSignalUuid', () => {
    it('should generate a uuid without key', () => {
      const startedAt = new Date('2020-12-17T16:27:00Z');
      const signalUuid = calculateThresholdSignalUuid('abcd', startedAt, ['agent.name']);
      expect(signalUuid).toEqual('a4832768-a379-583a-b1a2-e2ce2ad9e6e9');
    });

    it('should generate a uuid with key', () => {
      const startedAt = new Date('2019-11-18T13:32:00Z');
      const signalUuid = calculateThresholdSignalUuid('abcd', startedAt, ['host.ip'], '1.2.3.4');
      expect(signalUuid).toEqual('ee8870dc-45ff-5e6c-a2f9-80886651ce03');
    });
  });
});
