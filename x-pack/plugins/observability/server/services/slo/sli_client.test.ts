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
import { InternalQueryError } from '../../errors';
import { Duration, DurationUnit } from '../../types/models';
import { createSLO } from './fixtures/slo';
import { DefaultSLIClient } from './sli_client';

describe('SLIClient', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('fetchCurrentSLIData', () => {
    describe('for SLO defined with occurrences budgeting method', () => {
      it('throws when aggregations failed', async () => {
        const slo = createSLO({
          time_window: {
            duration: new Duration(7, DurationUnit.d),
            is_rolling: true,
          },
        });
        esClientMock.search.mockResolvedValueOnce({
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
          aggregations: {},
        });
        const sliClient = new DefaultSLIClient(esClientMock);

        await expect(sliClient.fetchCurrentSLIData(slo)).rejects.toThrowError(
          new InternalQueryError('SLI aggregation query')
        );
      });

      describe('for a rolling time window SLO type', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            time_window: {
              duration: new Duration(7, DurationUnit.d),
              is_rolling: true,
            },
          });
          esClientMock.search.mockResolvedValueOnce({
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
            aggregations: {
              good: { value: 90 },
              total: { value: 100 },
            },
          });
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData(slo);

          const expectedDateRange = toDateRange(slo.time_window);

          expect(result).toMatchObject({
            good: 90,
            total: 100,
          });
          expect(result.date_range.from).toBeClose(expectedDateRange.from);
          expect(result.date_range.to).toBeClose(expectedDateRange.to);

          expect(esClientMock.search).toHaveBeenCalledWith(
            expect.objectContaining({
              index: `${SLO_DESTINATION_INDEX_NAME}*`,
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
            })
          );
        });
      });

      describe('for a calendar aligned time window SLO type', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            time_window: {
              duration: new Duration(1, DurationUnit.M),
              calendar: {
                start_time: new Date('2022-09-01T00:00:00.000Z'),
              },
            },
          });
          esClientMock.search.mockResolvedValueOnce({
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
            aggregations: {
              good: { value: 90 },
              total: { value: 100 },
            },
          });
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData(slo);

          const expectedDateRange = toDateRange(slo.time_window);

          expect(result).toMatchObject({ good: 90, total: 100 });
          expect(result.date_range.from).toBeClose(expectedDateRange.from);
          expect(result.date_range.to).toBeClose(expectedDateRange.to);
          expect(esClientMock.search).toHaveBeenCalledWith(
            expect.objectContaining({
              index: `${SLO_DESTINATION_INDEX_NAME}*`,
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
            })
          );
        });
      });
    });

    describe('for SLO defined with timeslices budgeting method', () => {
      it('throws when aggregations failed', async () => {
        const slo = createSLO({
          budgeting_method: 'timeslices',
          objective: {
            target: 0.95,
            timeslice_target: 0.95,
            timeslice_window: new Duration(10, DurationUnit.m),
          },
        });

        esClientMock.search.mockResolvedValueOnce({
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
          aggregations: {},
        });
        const sliClient = new DefaultSLIClient(esClientMock);

        await expect(sliClient.fetchCurrentSLIData(slo)).rejects.toThrowError(
          new InternalQueryError('SLI aggregation query')
        );
      });

      describe('for a calendar aligned time window SLO type', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            budgeting_method: 'timeslices',
            objective: {
              target: 0.95,
              timeslice_target: 0.9,
              timeslice_window: new Duration(10, DurationUnit.m),
            },
            time_window: {
              duration: new Duration(1, DurationUnit.M),
              calendar: {
                start_time: new Date('2022-09-01T00:00:00.000Z'),
              },
            },
          });
          esClientMock.search.mockResolvedValueOnce({
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
            aggregations: {
              slices: { buckets: [] },
              good: { value: 90 },
              total: { value: 100 },
            },
          });
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData(slo);

          const expectedDateRange = toDateRange(slo.time_window);
          expect(result).toMatchObject({ good: 90, total: 100 });
          expect(result.date_range.from).toBeClose(expectedDateRange.from);
          expect(result.date_range.to).toBeClose(expectedDateRange.to);
          expect(esClientMock.search).toHaveBeenCalledWith(
            expect.objectContaining({
              index: `${SLO_DESTINATION_INDEX_NAME}*`,
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
                slices: {
                  date_histogram: {
                    field: '@timestamp',
                    fixed_interval: '10m',
                  },
                  aggs: {
                    good: {
                      sum: {
                        field: 'slo.numerator',
                      },
                    },
                    total: {
                      sum: {
                        field: 'slo.denominator',
                      },
                    },
                    good_slice: {
                      bucket_script: {
                        buckets_path: {
                          good: 'good',
                          total: 'total',
                        },
                        script: `params.good / params.total >= ${slo.objective.timeslice_target} ? 1 : 0`,
                      },
                    },
                    count_slice: {
                      bucket_script: {
                        buckets_path: {},
                        script: '1',
                      },
                    },
                  },
                },
                good: {
                  sum_bucket: {
                    buckets_path: 'slices>good_slice.value',
                  },
                },
                total: {
                  sum_bucket: {
                    buckets_path: 'slices>count_slice.value',
                  },
                },
              },
            })
          );
        });
      });

      describe('for a rolling time window SLO type', () => {
        it('returns the aggregated good and total values', async () => {
          const slo = createSLO({
            budgeting_method: 'timeslices',
            objective: {
              target: 0.95,
              timeslice_target: 0.9,
              timeslice_window: new Duration(10, DurationUnit.m),
            },
            time_window: {
              duration: new Duration(1, DurationUnit.M),
              is_rolling: true,
            },
          });
          esClientMock.search.mockResolvedValueOnce({
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
            aggregations: {
              good: { value: 90 },
              total: { value: 100 },
            },
          });
          const sliClient = new DefaultSLIClient(esClientMock);

          const result = await sliClient.fetchCurrentSLIData(slo);

          const expectedDateRange = toDateRange(slo.time_window);
          expect(result).toMatchObject({ good: 90, total: 100 });
          expect(result.date_range.from).toBeClose(expectedDateRange.from);
          expect(result.date_range.to).toBeClose(expectedDateRange.to);
          expect(esClientMock.search).toHaveBeenCalledWith(
            expect.objectContaining({
              index: `${SLO_DESTINATION_INDEX_NAME}*`,
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
                slices: {
                  date_histogram: {
                    field: '@timestamp',
                    fixed_interval: '10m',
                  },
                  aggs: {
                    good: {
                      sum: {
                        field: 'slo.numerator',
                      },
                    },
                    total: {
                      sum: {
                        field: 'slo.denominator',
                      },
                    },
                    good_slice: {
                      bucket_script: {
                        buckets_path: {
                          good: 'good',
                          total: 'total',
                        },
                        script: `params.good / params.total >= ${slo.objective.timeslice_target} ? 1 : 0`,
                      },
                    },
                    count_slice: {
                      bucket_script: {
                        buckets_path: {},
                        script: '1',
                      },
                    },
                  },
                },
                good: {
                  sum_bucket: {
                    buckets_path: 'slices>good_slice.value',
                  },
                },
                total: {
                  sum_bucket: {
                    buckets_path: 'slices>count_slice.value',
                  },
                },
              },
            })
          );
        });
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
