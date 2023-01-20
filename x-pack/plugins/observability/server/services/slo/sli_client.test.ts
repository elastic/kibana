/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import moment from 'moment';

import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services';
import { Duration, DurationUnit } from '../../domain/models';
import { createSLO } from './fixtures/slo';
import { DefaultSLIClient } from './sli_client';
import { sevenDaysRolling, weeklyCalendarAligned } from './fixtures/time_window';

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

const getMsearchResponse = (good: number = 90, total: number = 100) => ({
  ...commonEsResponse,
  responses: [
    {
      ...commonEsResponse,
      aggregations: {
        good: { value: good },
        total: { value: total },
      },
    },
  ],
});

describe('SLIClient', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('fetchCurrentSLIData', () => {
    describe('with occurrences budgeting method', () => {
      describe('with a rolling time window', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({ timeWindow: sevenDaysRolling() });
          esClientMock.msearch.mockResolvedValueOnce(getMsearchResponse());
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData([slo]);

          const expectedDateRange = toDateRange(slo.timeWindow);
          expect(result[slo.id]).toMatchObject({
            good: 90,
            total: 100,
          });
          expect(result[slo.id].dateRange.from).toBeClose(expectedDateRange.from);
          expect(result[slo.id].dateRange.to).toBeClose(expectedDateRange.to);
          // @ts-ignore searches not typed properly
          expect(esClientMock.msearch.mock.calls[0][0].searches).toEqual([
            { index: `${SLO_DESTINATION_INDEX_NAME}*` },
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    { term: { 'slo.id': slo.id } },
                    { term: { 'slo.revision': slo.revision } },
                    {
                      range: {
                        '@timestamp': { gte: expect.anything(), lt: expect.anything() },
                      },
                    },
                  ],
                },
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
          ]);
        });
      });

      describe('with a calendar aligned time window', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            timeWindow: weeklyCalendarAligned(new Date('2022-09-01T00:00:00.000Z')),
          });
          esClientMock.msearch.mockResolvedValueOnce(getMsearchResponse());
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData([slo]);

          const expectedDateRange = toDateRange(slo.timeWindow);
          expect(result[slo.id]).toMatchObject({ good: 90, total: 100 });
          expect(result[slo.id].dateRange.from).toBeClose(expectedDateRange.from);
          expect(result[slo.id].dateRange.to).toBeClose(expectedDateRange.to);
          // @ts-ignore searches not typed properly
          expect(esClientMock.msearch.mock.calls[0][0].searches).toEqual([
            { index: `${SLO_DESTINATION_INDEX_NAME}*` },
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    { term: { 'slo.id': slo.id } },
                    { term: { 'slo.revision': slo.revision } },
                    {
                      range: {
                        '@timestamp': {
                          gte: expectedDateRange.from.toISOString(),
                          lt: expectedDateRange.to.toISOString(),
                        },
                      },
                    },
                  ],
                },
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
          ]);
        });
      });
    });

    describe('with timeslices budgeting method', () => {
      describe('with a calendar aligned time window', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            budgetingMethod: 'timeslices',
            objective: {
              target: 0.95,
              timesliceTarget: 0.9,
              timesliceWindow: new Duration(10, DurationUnit.Minute),
            },
            timeWindow: weeklyCalendarAligned(new Date('2022-09-01T00:00:00.000Z')),
          });
          esClientMock.msearch.mockResolvedValueOnce(getMsearchResponse());
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData([slo]);

          const expectedDateRange = toDateRange(slo.timeWindow);
          expect(result[slo.id]).toMatchObject({ good: 90, total: 100 });
          expect(result[slo.id].dateRange.from).toBeClose(expectedDateRange.from);
          expect(result[slo.id].dateRange.to).toBeClose(expectedDateRange.to);
          // @ts-ignore searches not typed properly
          expect(esClientMock.msearch.mock.calls[0][0].searches).toEqual([
            { index: `${SLO_DESTINATION_INDEX_NAME}*` },
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    { term: { 'slo.id': slo.id } },
                    { term: { 'slo.revision': slo.revision } },
                    {
                      range: {
                        '@timestamp': {
                          gte: expectedDateRange.from.toISOString(),
                          lt: expectedDateRange.to.toISOString(),
                        },
                      },
                    },
                  ],
                },
              },
              aggs: {
                good: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              },
            },
          ]);
        });
      });

      describe('with a rolling time window', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            budgetingMethod: 'timeslices',
            objective: {
              target: 0.95,
              timesliceTarget: 0.9,
              timesliceWindow: new Duration(10, DurationUnit.Minute),
            },
            timeWindow: sevenDaysRolling(),
          });
          esClientMock.msearch.mockResolvedValueOnce(getMsearchResponse());
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData([slo]);

          const expectedDateRange = toDateRange(slo.timeWindow);
          expect(result[slo.id]).toMatchObject({ good: 90, total: 100 });
          expect(result[slo.id].dateRange.from).toBeClose(expectedDateRange.from);
          expect(result[slo.id].dateRange.to).toBeClose(expectedDateRange.to);
          // @ts-ignore searches not typed properly
          expect(esClientMock.msearch.mock.calls[0][0].searches).toEqual([
            { index: `${SLO_DESTINATION_INDEX_NAME}*` },
            {
              size: 0,
              query: {
                bool: {
                  filter: [
                    { term: { 'slo.id': slo.id } },
                    { term: { 'slo.revision': slo.revision } },
                    {
                      range: {
                        '@timestamp': { gte: expect.anything(), lt: expect.anything() },
                      },
                    },
                  ],
                },
              },
              aggs: {
                good: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              },
            },
          ]);
        });
      });
    });
  });

  describe('fetchSLIDataFrom', () => {
    const LONG_WINDOW = 'long_window';
    const SHORT_WINDOW = 'short_window';

    describe('for SLO defined with occurrences budgeting method', () => {
      it('calls ES with the lookback windows aggregations', async () => {
        const slo = createSLO({ budgetingMethod: 'occurrences' });
        const lookbackWindows = [
          { name: LONG_WINDOW, duration: new Duration(1, DurationUnit.Hour) },
          { name: SHORT_WINDOW, duration: new Duration(5, DurationUnit.Minute) },
        ];
        esClientMock.search.mockResolvedValueOnce({
          ...commonEsResponse,
          aggregations: {
            [LONG_WINDOW]: {
              buckets: [
                {
                  key: '2022-11-08T13:53:00.000Z-2022-11-08T14:53:00.000Z',
                  from: 1667915580000,
                  from_as_string: '2022-11-08T13:53:00.000Z',
                  to: 1667919180000,
                  to_as_string: '2022-11-08T14:53:00.000Z',
                  doc_count: 60,
                  total: {
                    value: 32169,
                  },
                  good: {
                    value: 15748,
                  },
                },
              ],
            },
            [SHORT_WINDOW]: {
              buckets: [
                {
                  key: '2022-11-08T14:48:00.000Z-2022-11-08T14:53:00.000Z',
                  from: 1667918880000,
                  from_as_string: '2022-11-08T14:48:00.000Z',
                  to: 1667919180000,
                  to_as_string: '2022-11-08T14:53:00.000Z',
                  doc_count: 5,
                  total: {
                    value: 2211,
                  },
                  good: {
                    value: 772,
                  },
                },
              ],
            },
          },
        });
        const sliClient = new DefaultSLIClient(esClientMock);

        const result = await sliClient.fetchSLIDataFrom(slo, lookbackWindows);

        expect(esClientMock?.search?.mock?.lastCall?.[0]).toMatchObject({
          aggs: {
            [LONG_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [{ from: 'now-1h/m', to: 'now/m' }],
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
            [SHORT_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [{ from: 'now-5m/m', to: 'now/m' }],
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
          },
        });

        expect(result[LONG_WINDOW]).toMatchObject({ good: 15748, total: 32169 });
        expect(result[SHORT_WINDOW]).toMatchObject({ good: 772, total: 2211 });
      });
    });

    describe('for SLO defined with timeslices budgeting method', () => {
      it('calls ES with the lookback windows aggregations', async () => {
        const slo = createSLO({
          budgetingMethod: 'timeslices',
          objective: {
            target: 0.95,
            timesliceTarget: 0.9,
            timesliceWindow: new Duration(10, DurationUnit.Minute),
          },
        });

        const lookbackWindows = [
          { name: LONG_WINDOW, duration: new Duration(1, DurationUnit.Hour) },
          { name: SHORT_WINDOW, duration: new Duration(5, DurationUnit.Minute) },
        ];
        esClientMock.search.mockResolvedValueOnce({
          ...commonEsResponse,
          aggregations: {
            [LONG_WINDOW]: {
              buckets: [
                {
                  key: '2022-11-08T13:53:00.000Z-2022-11-08T14:53:00.000Z',
                  from: 1667915580000,
                  from_as_string: '2022-11-08T13:53:00.000Z',
                  to: 1667919180000,
                  to_as_string: '2022-11-08T14:53:00.000Z',
                  doc_count: 60,
                  total: {
                    value: 32169,
                  },
                  good: {
                    value: 15748,
                  },
                },
              ],
            },
            [SHORT_WINDOW]: {
              buckets: [
                {
                  key: '2022-11-08T14:48:00.000Z-2022-11-08T14:53:00.000Z',
                  from: 1667918880000,
                  from_as_string: '2022-11-08T14:48:00.000Z',
                  to: 1667919180000,
                  to_as_string: '2022-11-08T14:53:00.000Z',
                  doc_count: 5,
                  total: {
                    value: 2211,
                  },
                  good: {
                    value: 772,
                  },
                },
              ],
            },
          },
        });
        const sliClient = new DefaultSLIClient(esClientMock);

        const result = await sliClient.fetchSLIDataFrom(slo, lookbackWindows);

        expect(esClientMock?.search?.mock?.lastCall?.[0]).toMatchObject({
          aggs: {
            [LONG_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [{ from: 'now-1h/m', to: 'now/m' }],
              },
              aggs: {
                good: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              },
            },
            [SHORT_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [{ from: 'now-5m/m', to: 'now/m' }],
              },
              aggs: {
                good: {
                  sum: {
                    field: 'slo.isGoodSlice',
                  },
                },
                total: {
                  value_count: {
                    field: 'slo.isGoodSlice',
                  },
                },
              },
            },
          },
        });

        expect(result[LONG_WINDOW]).toMatchObject({ good: 15748, total: 32169 });
        expect(result[SHORT_WINDOW]).toMatchObject({ good: 772, total: 2211 });
      });
    });
  });
});

expect.extend({
  toBeClose(received: Date | string, actual: Date | string) {
    const receivedDate = moment(received);
    const actualDate = moment(actual);
    return {
      message: () =>
        `expected ${receivedDate.toISOString()} to be close to ${actualDate.toISOString()}`,
      pass: Math.abs(receivedDate.diff(actualDate, 'seconds')) <= 120,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeClose(actual: Date | string): R;
    }
  }
}
