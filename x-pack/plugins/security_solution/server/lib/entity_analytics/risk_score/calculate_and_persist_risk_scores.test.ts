/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';

import { calculateAndPersistRiskScores } from './calculate_and_persist_risk_scores';
import { calculateRiskScores } from './calculate_risk_scores';
import { calculateRiskScoresMock } from './calculate_risk_scores.mock';
import { riskScoreDataClientMock } from './risk_score_data_client.mock';
import type { RiskScoreDataClient } from './risk_score_data_client';

jest.mock('./calculate_risk_scores');

const calculateAndPersistRecentHostRiskScores = (
  esClient: ElasticsearchClient,
  logger: Logger,
  riskScoreDataClient: RiskScoreDataClient
) => {
  return calculateAndPersistRiskScores({
    afterKeys: {},
    identifierType: 'host',
    esClient,
    logger,
    index: 'index',
    pageSize: 500,
    spaceId: 'default',
    range: { start: 'now - 15d', end: 'now' },
    riskScoreDataClient,
    assetCriticalityService: assetCriticalityServiceMock.create(),
    runtimeMappings: {},
  });
};

describe('calculateAndPersistRiskScores', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let riskScoreDataClient: RiskScoreDataClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
    riskScoreDataClient = riskScoreDataClientMock.create();
  });

  describe('with no risk scores to persist', () => {
    beforeEach(() => {
      (calculateRiskScores as jest.Mock).mockResolvedValueOnce(
        calculateRiskScoresMock.buildResponse({ scores: { host: [] } })
      );
    });

    it('does not upgrade configurations', async () => {
      await calculateAndPersistRecentHostRiskScores(esClient, logger, riskScoreDataClient);

      expect(riskScoreDataClient.upgradeIfNeeded).not.toHaveBeenCalled();
    });

    it('returns an appropriate response', async () => {
      const results = await calculateAndPersistRecentHostRiskScores(
        esClient,
        logger,
        riskScoreDataClient
      );

      expect(results).toEqual({ after_keys: {}, errors: [], scores_written: 0 });
    });
  });
  describe('with risk scores to persist', () => {
    beforeEach(() => {
      (calculateRiskScores as jest.Mock).mockResolvedValueOnce(
        calculateRiskScoresMock.buildResponseWithOneScore()
      );
    });
    it('upgrades configurations when persisting risk scores', async () => {
      await calculateAndPersistRecentHostRiskScores(esClient, logger, riskScoreDataClient);

      expect(riskScoreDataClient.upgradeIfNeeded).toHaveBeenCalled();
    });
  });
});
