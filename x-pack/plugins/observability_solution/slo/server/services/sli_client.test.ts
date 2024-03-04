/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import moment from 'moment';
import { ALL_VALUE } from '@kbn/slo-schema';

import { Duration, DurationUnit } from '../domain/models';
import { createSLO } from './fixtures/slo';
import { DefaultSLIClient } from './sli_client';

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

const TEST_DATE = new Date('2023-01-01T00:00:00.000Z');

describe('SummaryClient', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    jest.useFakeTimers().setSystemTime(TEST_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
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
                  key: '2022-12-31T22:54:00.000Z-2022-12-31T23:54:00.000Z',
                  from: 1672527240000,
                  from_as_string: '2022-12-31T22:54:00.000Z',
                  to: 1672530840000,
                  to_as_string: '2022-12-31T23:54:00.000Z',
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
                  key: '2022-12-31T23:49:00.000Z-2022-12-31T23:54:00.000Z',
                  from: 1672530540000,
                  from_as_string: '2022-12-31T23:49:00.000Z',
                  to: 1672530840000,
                  to_as_string: '2022-12-31T23:54:00.000Z',
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
        const summaryClient = new DefaultSLIClient(esClientMock);

        const result = await summaryClient.fetchSLIDataFrom(slo, ALL_VALUE, lookbackWindows);

        expect(esClientMock?.search?.mock?.lastCall?.[0]).toMatchObject({
          aggs: {
            [LONG_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: '2022-12-31T22:54:00.000Z',
                    to: '2022-12-31T23:54:00.000Z',
                  },
                ],
              },
              aggs: {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              },
            },
            [SHORT_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: '2022-12-31T23:49:00.000Z',
                    to: '2022-12-31T23:54:00.000Z',
                  },
                ],
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
                  key: '2022-12-31T22:36:00.000Z-2022-12-31T23:36:00.000Z',
                  from: 1672526160000,
                  from_as_string: '2022-12-31T22:36:00.000Z',
                  to: 1672529760000,
                  to_as_string: '2022-12-31T23:36:00.000Z',
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
                  key: '2022-12-31T23:31:00.000Z-2022-12-31T23:36:00.000Z',
                  from: 1672529460000,
                  from_as_string: '2022-12-31T23:31:00.000Z',
                  to: 1672529760000,
                  to_as_string: '2022-12-31T23:36:00.000Z',
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
        const summaryClient = new DefaultSLIClient(esClientMock);

        const result = await summaryClient.fetchSLIDataFrom(slo, ALL_VALUE, lookbackWindows);

        expect(esClientMock?.search?.mock?.lastCall?.[0]).toMatchObject({
          aggs: {
            [LONG_WINDOW]: {
              date_range: {
                field: '@timestamp',
                ranges: [
                  {
                    from: '2022-12-31T22:36:00.000Z',
                    to: '2022-12-31T23:36:00.000Z',
                  },
                ],
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
                ranges: [
                  {
                    from: '2022-12-31T23:31:00.000Z',
                    to: '2022-12-31T23:36:00.000Z',
                  },
                ],
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
