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
import { DefaultHistoricalSummaryClient } from './historical_summary_client';

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
  const numberOfBuckets = rollingDays * 2;
  const day = moment.utc().subtract(numberOfBuckets, 'day').startOf('day');
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
                key_as_string: day.clone().add(index, 'day').toISOString(),
                key: day.clone().add(index, 'day').format('x'),
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

const generateEsResponseForCalendarAlignedSLO = (good: number = 97, total: number = 100) => {
  const day = moment.utc().startOf('month');
  return {
    ...commonEsResponse,
    responses: [
      {
        ...commonEsResponse,
        aggregations: {
          daily: {
            buckets: Array(18)
              .fill(0)
              .map((_, index) => ({
                key_as_string: day.clone().add(index, 'day').toISOString(),
                key: day.clone().add(index, 'day').format('x'),
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
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
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

      expect(results[slo.id]).toHaveLength(30);
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
      expect(results[slo.id]).toHaveLength(30);
    });
  });

  describe('Calendar Aligned and Timeslices SLOs', () => {
    it('returns the summary', async () => {
      const slo = createSLO({
        timeWindow: {
          duration: oneMonth(),
          calendar: { startTime: new Date('2023-01-01T00:00:00.000Z') },
        },
        budgetingMethod: 'timeslices',
        objective: { target: 0.95, timesliceTarget: 0.9, timesliceWindow: oneMinute() },
      });
      esClientMock.msearch.mockResolvedValueOnce(generateEsResponseForCalendarAlignedSLO());
      const client = new DefaultHistoricalSummaryClient(esClientMock);

      const results = await client.fetch([slo]);

      results[slo.id].forEach((dailyResult) =>
        expect(dailyResult).toMatchSnapshot({ date: expect.any(Date) })
      );

      expect(results[slo.id]).toHaveLength(18);
    });
  });

  describe('Calendar Aligned and Occurrences SLOs', () => {
    it('returns the summary', async () => {
      const slo = createSLO({
        timeWindow: {
          duration: oneMonth(),
          calendar: { startTime: new Date('2023-01-01T00:00:00.000Z') },
        },
        budgetingMethod: 'occurrences',
        objective: { target: 0.95 },
      });
      esClientMock.msearch.mockResolvedValueOnce(generateEsResponseForCalendarAlignedSLO());
      const client = new DefaultHistoricalSummaryClient(esClientMock);

      const results = await client.fetch([slo]);

      results[slo.id].forEach((dailyResult) =>
        expect(dailyResult).toMatchSnapshot({ date: expect.any(Date) })
      );

      expect(results[slo.id]).toHaveLength(18);
    });
  });
});
