/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CompositeSLO, Duration, DurationUnit } from '../../domain/models';
import { sevenDaysRolling } from '../slo/fixtures/time_window';
import { createCompositeSLO } from './fixtures/composite_slo';
import { DefaultSummaryClient } from './summary_client';

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

const createEsResponse = (compositeSlo: CompositeSLO) => ({
  ...commonEsResponse,
  responses: [
    {
      ...commonEsResponse,
      aggregations: {
        bySloId: {
          buckets: compositeSlo.sources.map((source) => ({
            key: source.id,
            good: { value: 95 },
            total: { value: 100 },
          })),
        },
      },
    },
  ],
});

describe('SummaryClient', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    jest.useFakeTimers().setSystemTime(new Date('2023-05-29T10:15:00.000Z'));
  });

  describe('fetchSummary', () => {
    describe('with a rolling and occurrences composite SLO', () => {
      it('returns the summary', async () => {
        const compositeSlo = createCompositeSLO({
          objective: { target: 0.97 },
          timeWindow: sevenDaysRolling(),
          sources: [
            { id: 'slo-1', revision: 1, weight: 2 },
            { id: 'slo-2', revision: 2, weight: 1 },
          ],
        });
        esClientMock.msearch.mockResolvedValueOnce(createEsResponse(compositeSlo));
        const summaryClient = new DefaultSummaryClient(esClientMock);

        const result = await summaryClient.fetchSummary([compositeSlo]);

        expect(result[compositeSlo.id]).toMatchSnapshot();
        // @ts-ignore
        expect(esClientMock.msearch.mock.calls[0][0].searches).toMatchSnapshot();
      });
    });
  });

  describe('with rolling and timeslices SLO', () => {
    it('returns the summary', async () => {
      const compositeSlo = createCompositeSLO({
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.97,
          timesliceTarget: 0.9,
          timesliceWindow: new Duration(10, DurationUnit.Minute),
        },
        sources: [
          { id: 'slo-1', revision: 1, weight: 2 },
          { id: 'slo-2', revision: 2, weight: 1 },
        ],
        timeWindow: sevenDaysRolling(),
      });
      esClientMock.msearch.mockResolvedValueOnce(createEsResponse(compositeSlo));
      const summaryClient = new DefaultSummaryClient(esClientMock);

      const result = await summaryClient.fetchSummary([compositeSlo]);

      expect(result[compositeSlo.id]).toMatchSnapshot();
      // @ts-ignore searches not typed properly
      expect(esClientMock.msearch.mock.calls[0][0].searches).toMatchSnapshot();
    });
  });
});
