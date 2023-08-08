/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { calculateAndPersistRiskScores } from './calculate_and_persist_risk_scores';
import { calculateRiskScores } from './calculate_risk_scores';
import { calculateRiskScoresMock } from './calculate_risk_scores.mock';

jest.mock('./calculate_risk_scores');

describe('calculateAndPersistRiskScores', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
  });

  describe('with no risk scores to persist', () => {
    beforeEach(() => {
      (calculateRiskScores as jest.Mock).mockResolvedValueOnce(
        calculateRiskScoresMock.buildResponse({ scores: { host: [] } })
      );
    });

    it('returns an appropriate response', async () => {
      const results = await calculateAndPersistRiskScores({
        afterKeys: {},
        identifierType: 'host',
        esClient,
        logger,
        index: 'index',
        pageSize: 500,
        range: { start: 'now - 15d', end: 'now' },
        spaceId: 'default',
        // @ts-expect-error not relevant for this test
        riskEngineDataClient: { getWriter: jest.fn() },
        runtimeMappings: {},
      });

      expect(results).toEqual({ after_keys: {}, errors: [], scores_written: 0 });
    });
  });
});
