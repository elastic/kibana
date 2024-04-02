/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';

import { calculateRiskScores } from './calculate_risk_scores';
import { calculateRiskScoresMock } from './calculate_risk_scores.mock';

describe('calculateRiskScores()', () => {
  let params: Parameters<typeof calculateRiskScores>[0];
  let esClient: ElasticsearchClient;
  let logger: Logger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
    params = {
      afterKeys: {},
      assetCriticalityService: assetCriticalityServiceMock.create(),
      esClient,
      logger,
      index: 'index',
      pageSize: 500,
      range: { start: 'now - 15d', end: 'now' },
      runtimeMappings: {},
    };
  });

  describe('inputs', () => {
    it('builds a filter on @timestamp based on the provided range', async () => {
      await calculateRiskScores(params);

      expect(
        (esClient.search as jest.Mock).mock.calls[0][0].query.function_score.query.bool.filter
      ).toEqual(
        expect.arrayContaining([
          {
            range: { '@timestamp': { gte: 'now - 15d', lt: 'now' } },
          },
        ])
      );
    });

    it('drops an empty object filter if specified by the caller', async () => {
      params.filter = {};
      await calculateRiskScores(params);

      expect(
        (esClient.search as jest.Mock).mock.calls[0][0].query.function_score.query.bool.filter
      ).toEqual(expect.not.arrayContaining([{}]));
    });

    it('drops an empty array filter if specified by the caller', async () => {
      params.filter = [];
      await calculateRiskScores(params);

      expect(
        (esClient.search as jest.Mock).mock.calls[0][0].query.function_score.query.bool.filter
      ).toEqual(expect.not.arrayContaining([[]]));
    });

    describe('identifierType', () => {
      it('creates aggs for both host and user by default', async () => {
        await calculateRiskScores(params);
        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            aggs: expect.objectContaining({ host: expect.anything(), user: expect.anything() }),
          })
        );
      });

      it('creates an aggregation per specified identifierType', async () => {
        params = { ...params, identifierType: 'host' };
        await calculateRiskScores(params);
        const [[call]] = (esClient.search as jest.Mock).mock.calls;
        expect(call).toEqual(
          expect.objectContaining({ aggs: expect.objectContaining({ host: expect.anything() }) })
        );
        expect(call.aggs).toHaveProperty('host');
        expect(call.aggs).not.toHaveProperty('user');
      });
    });

    describe('after_keys', () => {
      it('applies a single after_key to the correct aggregation', async () => {
        params = { ...params, afterKeys: { host: { 'host.name': 'foo' } } };
        await calculateRiskScores(params);
        const [[call]] = (esClient.search as jest.Mock).mock.calls;
        expect(call).toEqual(
          expect.objectContaining({
            aggs: expect.objectContaining({
              host: expect.objectContaining({
                composite: expect.objectContaining({ after: { 'host.name': 'foo' } }),
              }),
            }),
          })
        );
      });

      it('applies multiple after_keys to the correct aggregations', async () => {
        params = {
          ...params,
          afterKeys: {
            host: { 'host.name': 'foo' },
            user: { 'user.name': 'bar' },
          },
        };
        await calculateRiskScores(params);
        const [[call]] = (esClient.search as jest.Mock).mock.calls;

        expect(call).toEqual(
          expect.objectContaining({
            aggs: expect.objectContaining({
              host: expect.objectContaining({
                composite: expect.objectContaining({ after: { 'host.name': 'foo' } }),
              }),
              user: expect.objectContaining({
                composite: expect.objectContaining({ after: { 'user.name': 'bar' } }),
              }),
            }),
          })
        );
      });

      it('uses an undefined after_key by default', async () => {
        await calculateRiskScores(params);
        const [[call]] = (esClient.search as jest.Mock).mock.calls;

        expect(call).toEqual(
          expect.objectContaining({
            aggs: expect.objectContaining({
              host: expect.objectContaining({
                composite: expect.objectContaining({ after: undefined }),
              }),
              user: expect.objectContaining({
                composite: expect.objectContaining({ after: undefined }),
              }),
            }),
          })
        );
      });
    });
  });

  describe('outputs', () => {
    beforeEach(() => {
      // stub out a reasonable response
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: calculateRiskScoresMock.buildAggregationResponse(),
      });
    });

    it('returns a flattened list of risk scores', async () => {
      const response = await calculateRiskScores(params);
      expect(response).toHaveProperty('scores');
      expect(response.scores.host).toHaveLength(2);
      expect(response.scores.user).toHaveLength(2);
    });

    it('returns scores in the expected format', async () => {
      const {
        scores: { host: hostScores },
      } = await calculateRiskScores(params);
      const [score] = hostScores ?? [];
      expect(score).toEqual(
        expect.objectContaining({
          '@timestamp': expect.any(String),
          id_field: expect.any(String),
          id_value: expect.any(String),
          calculated_level: 'Low',
          calculated_score: expect.any(Number),
          calculated_score_norm: expect.any(Number),
          category_1_score: expect.any(Number),
          category_1_count: expect.any(Number),
          notes: expect.any(Array),
        })
      );
    });

    it('returns risk inputs in the expected format', async () => {
      const {
        scores: { user: userScores },
      } = await calculateRiskScores(params);
      const [score] = userScores ?? [];
      expect(score).toEqual(
        expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              index: expect.any(String),
              category: expect.any(String),
              description: expect.any(String),
              risk_score: expect.any(Number),
              timestamp: expect.any(String),
            }),
          ]),
        })
      );
    });
  });

  describe('error conditions', () => {
    it('raises an error if elasticsearch client rejects', async () => {
      (esClient.search as jest.Mock).mockRejectedValueOnce({
        aggregations: calculateRiskScoresMock.buildAggregationResponse(),
      });

      await expect(() => calculateRiskScores(params)).rejects.toEqual({
        aggregations: calculateRiskScoresMock.buildAggregationResponse(),
      });
    });

    describe('when the asset criticality service throws an error', () => {
      beforeEach(() => {
        (esClient.search as jest.Mock).mockResolvedValueOnce({
          aggregations: calculateRiskScoresMock.buildAggregationResponse(),
        });
        (
          params.assetCriticalityService.getCriticalitiesByIdentifiers as jest.Mock
        ).mockRejectedValueOnce(new Error('foo'));
      });

      it('logs the error but proceeds if asset criticality service throws', async () => {
        await expect(calculateRiskScores(params)).resolves.toEqual(
          expect.objectContaining({
            scores: expect.objectContaining({
              host: expect.arrayContaining([
                expect.objectContaining({
                  calculated_level: expect.any(String),
                  id_field: expect.any(String),
                  id_value: expect.any(String),
                }),
              ]),
            }),
          })
        );
        expect(logger.warn).toHaveBeenCalledWith(
          'Error retrieving criticality: Error: foo. Scoring will proceed without criticality information.'
        );
      });
    });
  });
});
