/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import moment from 'moment';
import { oneMinute, oneMonth, thirtyDays } from './fixtures/duration';
import { createSLO } from './fixtures/slo';
import {
  DefaultHistoricalSummaryClient,
  getFixedIntervalAndBucketsPerDay,
} from './historical_summary_client';

const commonEsResponse = {
  took: 100,
  timed_out: false,
  _shards: {
    total: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
  },
  hits: {
    hits: [],
  },
};

const generateEsResponseForRollingSLO = (
  rollingDays: number = 30,
  good: number = 97,
  total: number = 100
) => {
  const { fixedInterval, bucketsPerDay } = getFixedIntervalAndBucketsPerDay(rollingDays);
  const numberOfBuckets = rollingDays * bucketsPerDay;
  const doubleDuration = rollingDays * 2;
  const startDay = moment.utc().subtract(doubleDuration, 'day').startOf('day');
  const bucketSize = fixedInterval === '1d' ? 24 : Number(fixedInterval.slice(0, -1));
  return {
    ...commonEsResponse,
    responses: [
      {
        ...commonEsResponse,
        aggregations: {
          daily: {
            buckets: Array(numberOfBuckets)
              .fill(0)
              .map((_, index) => ({
                key_as_string: startDay
                  .clone()
                  .add(index * bucketSize, 'hours')
                  .toISOString(),
                key: startDay
                  .clone()
                  .add(index * bucketSize, 'hours')
                  .format('x'),
                doc_count: 1440,
                total: {
                  value: total,
                },
                good: {
                  value: good,
                },
                cumulative_good: {
                  value: good * (index + 1),
                },
                cumulative_total: {
                  value: total * (index + 1),
                },
              })),
          },
        },
      },
    ],
  };
};

const generateEsResponseForMonthlyCalendarAlignedSLO = (good: number = 97, total: number = 100) => {
  const { fixedInterval, bucketsPerDay } = getFixedIntervalAndBucketsPerDay(30);
  const currentDayInMonth = 18;
  const numberOfBuckets = currentDayInMonth * bucketsPerDay;
  const bucketSize = Number(fixedInterval.slice(0, -1));
  const startDay = moment.utc().startOf('month');

  return {
    ...commonEsResponse,
    responses: [
      {
        ...commonEsResponse,
        aggregations: {
          daily: {
            buckets: Array(numberOfBuckets)
              .fill(0)
              .map((_, index) => ({
                key_as_string: startDay
                  .clone()
                  .add(index * bucketSize, 'hours')
                  .toISOString(),
                key: startDay
                  .clone()
                  .add(index * bucketSize, 'hours')
                  .format('x'),
                doc_count: 1440,
                total: {
                  value: total,
                },
                good: {
                  value: good,
                },
                cumulative_good: {
                  value: good * (index + 1),
                },
                cumulative_total: {
                  value: total * (index + 1),
                },
              })),
          },
        },
      },
    ],
  };
};

describe('FetchHistoricalSummary', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-01-18T15:00:00.000Z'));
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('Rolling and Occurrences SLOs', () => {
    it('returns the summary', async () => {
      const slo = createSLO({
        timeWindow: { isRolling: true, duration: thirtyDays() },
        objective: { target: 0.95 },
      });
      esClientMock.msearch.mockResolvedValueOnce(generateEsResponseForRollingSLO(30));
      const client = new DefaultHistoricalSummaryClient(esClientMock);

      const results = await client.fetch([slo]);
      results[slo.id].forEach((dailyResult) =>
        expect(dailyResult).toMatchSnapshot({ date: expect.any(Date) })
      );

      expect(results[slo.id]).toHaveLength(180);
    });
  });

  describe('Rolling and Timeslices SLOs', () => {
    it('returns the summary', async () => {
      const slo = createSLO({
        timeWindow: { isRolling: true, duration: thirtyDays() },
        budgetingMethod: 'timeslices',
        objective: { target: 0.95, timesliceTarget: 0.9, timesliceWindow: oneMinute() },
      });
      esClientMock.msearch.mockResolvedValueOnce(generateEsResponseForRollingSLO(30));
      const client = new DefaultHistoricalSummaryClient(esClientMock);

      const results = await client.fetch([slo]);

      results[slo.id].forEach((dailyResult) =>
        expect(dailyResult).toMatchSnapshot({ date: expect.any(Date) })
      );
      expect(results[slo.id]).toHaveLength(180);
    });
  });

  describe('Calendar Aligned and Timeslices SLOs', () => {
    it('returns the summary', async () => {
      const slo = createSLO({
        timeWindow: {
          duration: oneMonth(),
          isCalendar: true,
        },
        budgetingMethod: 'timeslices',
        objective: { target: 0.95, timesliceTarget: 0.9, timesliceWindow: oneMinute() },
      });
      esClientMock.msearch.mockResolvedValueOnce(generateEsResponseForMonthlyCalendarAlignedSLO());
      const client = new DefaultHistoricalSummaryClient(esClientMock);

      const results = await client.fetch([slo]);

      results[slo.id].forEach((dailyResult) =>
        expect(dailyResult).toMatchSnapshot({ date: expect.any(Date) })
      );

      expect(results[slo.id]).toHaveLength(108);
    });
  });

  describe('Calendar Aligned and Occurrences SLOs', () => {
    it('returns the summary', async () => {
      const slo = createSLO({
        timeWindow: {
          duration: oneMonth(),
          isCalendar: true,
        },
        budgetingMethod: 'occurrences',
        objective: { target: 0.95 },
      });
      esClientMock.msearch.mockResolvedValueOnce(generateEsResponseForMonthlyCalendarAlignedSLO());
      const client = new DefaultHistoricalSummaryClient(esClientMock);

      const results = await client.fetch([slo]);

      results[slo.id].forEach((dailyResult) =>
        expect(dailyResult).toMatchSnapshot({ date: expect.any(Date) })
      );

      expect(results[slo.id]).toHaveLength(108);
    });
  });
});
