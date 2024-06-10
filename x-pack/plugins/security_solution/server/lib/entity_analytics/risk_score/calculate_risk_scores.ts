/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import _ from 'lodash';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import type { RiskScoresPreviewResponse } from '../../../../common/api/entity_analytics/risk_engine/preview_route.gen';
import type {
  ElasticsearchCalculateResponse,
  ElasticsearchEntityRiskScoreRecord,
} from '../../../../common/entity_analytics/risk_engine';
import { getRiskLevel, RiskCategories } from '../../../../common/entity_analytics/risk_engine';
import { withSecuritySpan } from '../../../utils/with_security_span';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import { applyCriticalityToScore, getCriticalityModifier } from '../asset_criticality/helpers';
import { RIEMANN_ZETA_VALUE } from './constants';
import type { CalculateScoresParams } from '../types';

const formatForResponse = ({
  score,
  criticality,
  now,
  includeNewFields,
}: {
  score: ElasticsearchEntityRiskScoreRecord;
  criticality?: AssetCriticalityRecord;
  now: string;
  includeNewFields: boolean;
}): EntityRiskScoreRecord => {
  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  const normalizedScoreWithCriticality = applyCriticalityToScore({
    score: score.calculated_score_norm,
    modifier: criticalityModifier,
  });
  const calculatedLevel = getRiskLevel(normalizedScoreWithCriticality);
  const categoryTwoScore = normalizedScoreWithCriticality - score.calculated_score_norm;
  const categoryTwoCount = criticalityModifier ? 1 : 0;

  const newFields = {
    category_2_score: categoryTwoScore,
    category_2_count: categoryTwoCount,
    criticality_level: criticality?.criticality_level,
    criticality_modifier: criticalityModifier,
  };

  return {
    '@timestamp': now,
    id_field: score.id_field,
    id_value: score.id_value,
    calculated_level: calculatedLevel,
    calculated_score: score.calculated_score,
    calculated_score_norm: normalizedScoreWithCriticality,
    category_1_score: score.category_1_score / RIEMANN_ZETA_VALUE, // normalize value to be between 0-100,
    category_1_count: score.category_1_count,
    notes: score.notes ?? [],
    inputs: score.inputs.map((riskInput) => ({
      id: riskInput.id,
      index: riskInput.index,
      description: `Alert from Rule: ${riskInput.rule_name ?? 'RULE_NOT_FOUND'}`,
      category: RiskCategories.category_1,
      risk_score: riskInput.risk_score,
      timestamp: riskInput.timestamp,
      contribution_score: riskInput.contribution_score,
    })),
    ...(includeNewFields ? newFields : {}),
  };
};

const processScores = async ({
  assetCriticalityService,
  scores,
  logger,
  now,
}: {
  assetCriticalityService: AssetCriticalityService;
  scores: ElasticsearchEntityRiskScoreRecord[];
  logger: Logger;
  now: string;
}): Promise<EntityRiskScoreRecord[]> => {
  if (scores.length === 0) {
    return [];
  }

  const isAssetCriticalityEnabled = await assetCriticalityService.isEnabled();
  if (!isAssetCriticalityEnabled) {
    return scores.map((score) => formatForResponse({ score, now, includeNewFields: false }));
  }

  const identifiers = scores.map((score) => _.pick(score, ['id_field', 'id_value']));

  let criticalities: AssetCriticalityRecord[] = [];
  try {
    criticalities = await assetCriticalityService.getCriticalitiesByIdentifiers(identifiers);
  } catch (e) {
    logger.warn(
      `Error retrieving criticality: ${e}. Scoring will proceed without criticality information.`
    );
  }

  return scores.map((score) => {
    const criticality = criticalities.find(
      (c) => c.id_field === score.id_field && c.id_value === score.id_value
    );

    return formatForResponse({ score, criticality, now, includeNewFields: true });
  });
};

export const calculateRiskScores = async ({
  afterKeys: userAfterKeys,
  assetCriticalityService,
  debug,
  esClient,
  filter: userFilter,
  identifierType,
  index,
  logger,
  pageSize,
  range,
  runtimeMappings,
  weights,
  alertSampleSizePerShard = 10_000,
}: {
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
} & CalculateScoresParams): Promise<RiskScoresPreviewResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const now = new Date().toISOString();

    const res = await esClient.transport.request<ElasticsearchCalculateResponse>(
      {
        method: 'POST',
        path: `/entity_analytics/risk_score/calculate?category_1_index=.alerts*&entity_types=${identifierType}`,
        // body: { // TODO: These params will be needed
        //   filter: userFilter,
        //   index,
        //   range,
        //   weights,
        // },
      },
      {
        requestTimeout: 120 * 1000,
        maxRetries: 0,
      }
    );

    const hostScores = await processScores({
      assetCriticalityService,
      scores: res.scores.host ?? [],
      logger,
      now,
    });

    const userScores = await processScores({
      assetCriticalityService,
      scores: res.scores.user ?? [],
      logger,
      now,
    });

    return {
      after_keys: {
        host: {},
        user: {},
      },
      scores: {
        host: hostScores,
        user: userScores,
      },
    };
  });
