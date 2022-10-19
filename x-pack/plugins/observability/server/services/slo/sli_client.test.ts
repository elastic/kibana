/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SLO_DESTINATION_INDEX_NAME } from '../../assets/constants';
import { toDateRange } from '../../domain/services/date_range';
import { InternalQueryError } from '../../errors';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { Duration, DurationUnit } from '../../types/models';
import { DefaultSLIClient } from './sli_client';

describe('SLIClient', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('fetchCurrentSLIData', () => {
    it('throws when aggregations failed', async () => {
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });
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

    describe('For a rolling time window SLO type', () => {
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
            full_window: { buckets: [{ good: { value: 90 }, total: { value: 100 } }] },
          },
        });
        const sliClient = new DefaultSLIClient(esClientMock);

        const result = await sliClient.fetchCurrentSLIData(slo);

        expect(result).toEqual({ good: 90, total: 100 });
        expect(esClientMock.search).toHaveBeenCalledWith(
          expect.objectContaining({
            index: `${SLO_DESTINATION_INDEX_NAME}*`,
            query: {
              bool: {
                filter: [
                  { term: { 'slo.id': slo.id } },
                  { term: { 'slo.revision': slo.revision } },
                ],
              },
            },
            aggs: {
              full_window: {
                date_range: {
                  field: '@timestamp',
                  ranges: [{ from: 'now-7d/m', to: 'now/m' }],
                },
                aggs: {
                  good: { sum: { field: 'slo.numerator' } },
                  total: { sum: { field: 'slo.denominator' } },
                },
              },
            },
          })
        );
      });
    });

    describe('For a calendar aligned time window SLO type', () => {
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
            full_window: { buckets: [{ good: { value: 90 }, total: { value: 100 } }] },
          },
        });
        const sliClient = new DefaultSLIClient(esClientMock);

        const result = await sliClient.fetchCurrentSLIData(slo);

        const expectedDateRange = toDateRange(slo.time_window);

        expect(result).toEqual({ good: 90, total: 100 });
        expect(esClientMock.search).toHaveBeenCalledWith(
          expect.objectContaining({
            index: `${SLO_DESTINATION_INDEX_NAME}*`,
            query: {
              bool: {
                filter: [
                  { term: { 'slo.id': slo.id } },
                  { term: { 'slo.revision': slo.revision } },
                ],
              },
            },
            aggs: {
              full_window: {
                date_range: {
                  field: '@timestamp',
                  ranges: [
                    {
                      from: expectedDateRange.from.toISOString(),
                      to: expectedDateRange.to.toISOString(),
                    },
                  ],
                },
                aggs: {
                  good: { sum: { field: 'slo.numerator' } },
                  total: { sum: { field: 'slo.denominator' } },
                },
              },
            },
          })
        );
      });
    });
  });
});
