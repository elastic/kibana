/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERT_RISK_SCORE,
  ALERT_RULE_NAME,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import _ from 'lodash';
import type { RiskScoresPreviewResponse } from '../../../../common/api/entity_analytics/risk_engine/preview_route.gen';
import type {
  AfterKeys,
  EntityRiskScoreRecord,
  RiskScoreWeights,
} from '../../../../common/api/entity_analytics/common';
import {
  type IdentifierType,
  getRiskLevel,
  RiskCategories,
  RiskWeightTypes,
} from '../../../../common/entity_analytics/risk_engine';
import { withSecuritySpan } from '../../../utils/with_security_span';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import { applyCriticalityToScore, getCriticalityModifier } from '../asset_criticality/helpers';
import { getAfterKeyForIdentifierType, getFieldForIdentifier } from './helpers';
import type {
  SearchHitRiskInput,
  CalculateRiskScoreAggregations,
  CalculateScoresParams,
} from '../types';
import { RIEMANN_ZETA_VALUE, RIEMANN_ZETA_S_VALUE } from './constants';
import { getPainlessScripts, type PainlessScripts } from './painless';
const RISK_SCORING_INPUTS_COUNT_MAX = 999999;
const RISK_SCORING_SUM_MAX = 261.2;
const RISK_CATEGORIES = Object.values(RiskCategories);
const formatForResponse = ({
  result,
  criticality,
  now,
  identifierField,
  identifier,
  includeNewFields,
}: {
  result: CalculationResult;
  criticality?: AssetCriticalityRecord;
  now: string;
  identifierField: string;
  identifier: string;
  includeNewFields: boolean;
}): EntityRiskScoreRecord => {
  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  const normalizedScoreWithCriticality = applyCriticalityToScore({
    score: result.normalized_score,
    modifier: criticalityModifier,
  });
  const calculatedLevel = getRiskLevel(normalizedScoreWithCriticality);
  const categoryTwoScore = normalizedScoreWithCriticality - result.normalized_score;
  const categoryTwoCount = criticalityModifier ? 1 : 0;

  const newFields = {
    category_2_score: categoryTwoScore,
    category_2_count: categoryTwoCount,
    criticality_level: criticality?.criticality_level,
    criticality_modifier: criticalityModifier,
  };

  return {
    '@timestamp': now,
    id_field: identifierField,
    id_value: identifier,
    calculated_level: calculatedLevel,
    calculated_score: result.score,
    calculated_score_norm: normalizedScoreWithCriticality,
    category_1_score: result.category_1_score / RIEMANN_ZETA_VALUE, // normalize value to be between 0-100
    category_1_count: result.category_1_count,
    notes: result.notes,
    inputs: result.risk_inputs.map((riskInput) => ({
      id: riskInput.id,
      index: riskInput.index,
      description: `Alert from Rule: ${riskInput.rule_name ?? 'RULE_NOT_FOUND'}`,
      category: RiskCategories.category_1,
      risk_score: riskInput.score,
      timestamp: riskInput.time,
      contribution_score: riskInput.contribution,
    })),
    ...(includeNewFields ? newFields : {}),
  };
};

const filterFromRange = (range: CalculateScoresParams['range']): QueryDslQueryContainer => ({
  range: { '@timestamp': { lt: range.end, gte: range.start } },
});

export interface CalculationResult {
  score: number;
  normalized_score: number;
  notes: string[];
  category_1_score: number;
  category_1_count: number;
  risk_inputs: SearchHitRiskInput[];
}

interface CalculationInput {
  id: string;
  index: string;
  time: string;
  rule_name: string;
  category: string;
  score: number;
}

interface CalculationResultWithIdentifier {
  result: CalculationResult;
  identifier: string;
}

const convertCategoryToEventKindValue = (category?: string): string | undefined =>
  category === 'category_1' ? 'signal' : category;

// buildReduceScript typescript equivalent
export const calculateRiskScore = ({
  inputs,
  globalIdentifierTypeWeight,
}: {
  inputs: CalculationInput[];
  globalIdentifierTypeWeight?: number;
}): CalculationResult => {
  const result: CalculationResult = {
    score: 0,
    normalized_score: 0,
    notes: [],
    category_1_score: 0,
    category_1_count: 0,
    risk_inputs: [],
  };

  const riskInputs: Array<{
    id: string;
    index: string;
    description: string;
    category: string;
    risk_score: number;
    timestamp: string;
    contribution_score: number;
  }> = [];
  const numInputsToScore = Math.min(inputs.length, RISK_SCORING_INPUTS_COUNT_MAX);
  result.notes = [];
  if (numInputsToScore === RISK_SCORING_INPUTS_COUNT_MAX) {
    result.notes.push(
      `Number of risk inputs (${inputs.length}) exceeded the maximum allowed (${RISK_SCORING_INPUTS_COUNT_MAX}).`
    );
  }

  let totalScore = 0;
  let currentScore = 0;
  for (let i = 0; i < numInputsToScore; i++) {
    currentScore = inputs[i].score / Math.pow(i + 1, RIEMANN_ZETA_S_VALUE);

    if (i < 10) {
      const contributionScore = (100 * currentScore) / RISK_SCORING_SUM_MAX;
      riskInputs.push({
        id: inputs[i].id,
        index: inputs[i].index,
        description: `Alert from Rule: ${inputs[i].rule_name ?? 'RULE_NOT_FOUND'}`,
        category: RiskCategories.category_1,
        risk_score: inputs[i].score,
        timestamp: inputs[i].time,
        contribution_score: contributionScore,
      });
    }

    RISK_CATEGORIES.forEach((riskCategory) => {
      if (inputs[i].category === convertCategoryToEventKindValue(riskCategory)) {
        result[`${riskCategory}_score`] += currentScore;
        result[`${riskCategory}_count`] += 1;
      }
    });
    totalScore += currentScore;
  }

  const scoreNorm = (100 * totalScore) / RISK_SCORING_SUM_MAX;
  result.score =
    globalIdentifierTypeWeight != null ? totalScore * globalIdentifierTypeWeight : totalScore;
  result.normalized_score = scoreNorm;
  result.risk_inputs = riskInputs;

  return result;
};

const buildIdentifierTypeAggregation = ({
  afterKeys,
  identifierType,
  pageSize,
  weights,
  alertSampleSizePerShard,
  scriptedMetricPainless,
}: {
  afterKeys: AfterKeys;
  identifierType: IdentifierType;
  pageSize: number;
  weights?: RiskScoreWeights;
  alertSampleSizePerShard: number;
  scriptedMetricPainless: PainlessScripts;
}): AggregationsAggregationContainer => {
  const identifierField = getFieldForIdentifier(identifierType);

  return {
    composite: {
      size: pageSize,
      sources: [
        {
          [identifierField]: {
            terms: {
              field: identifierField,
            },
          },
        },
      ],
      after: getAfterKeyForIdentifierType({ identifierType, afterKeys }),
    },
    aggs: {
      top_inputs: {
        top_hits: {
          size: 100, // this is the maximum number of alerts we can bring back in top_hits
          sort: [{ [ALERT_RISK_SCORE]: { order: 'desc' } }],
          _source: {
            includes: [ALERT_RISK_SCORE, EVENT_KIND, ALERT_RULE_NAME, ALERT_UUID, '@timestamp'],
          },
        },
      },
    },
  };
};

export const getGlobalWeightForIdentifierType = (
  identifierType: IdentifierType,
  weights?: RiskScoreWeights
): number | undefined =>
  weights?.find((weight) => weight.type === RiskWeightTypes.global)?.[identifierType];

const calculateScores = async ({
  identifierType,
  searchResponse,
  weights,
}: {
  weights?: RiskScoreWeights;
  identifierType: IdentifierType;
  searchResponse: SearchResponse<never, CalculateRiskScoreAggregations>;
}): Promise<CalculationResultWithIdentifier[]> => {
  const globalIdentifierTypeWeight = getGlobalWeightForIdentifierType(identifierType, weights);

  const buckets = searchResponse.aggregations?.[identifierType]?.buckets ?? [];

  return buckets.map((bucket) => {
    const identifier = bucket.key[getFieldForIdentifier(identifierType)];
    const inputsWithWeights: CalculationInput[] = bucket.top_inputs.hits.hits.map(
      ({ _source: input }) => {
        const score = _.get(input, ALERT_RISK_SCORE, 0);
        const eventKind = _.get(input, EVENT_KIND);
        // all of this can be changed to just use the input as-is and add weighted_score
        return {
          category: eventKind || 'signal', // TODO: this is bad
          score,
          time: _.get(input, '@timestamp') as string,
          rule_name: _.get(input, ALERT_RULE_NAME),
          index: _.get(input, '_index'),
          id: _.get(input, ALERT_UUID),
        };
      }
    );

    return {
      identifier,
      result: calculateRiskScore({
        inputs: inputsWithWeights,
        globalIdentifierTypeWeight,
      }),
    };
  });
};

const processScores = async ({
  assetCriticalityService,
  results,
  identifierField,
  logger,
  now,
}: {
  assetCriticalityService: AssetCriticalityService;
  results: CalculationResultWithIdentifier[];
  identifierField: string;
  logger: Logger;
  now: string;
}): Promise<EntityRiskScoreRecord[]> => {
  if (results.length === 0) {
    return [];
  }

  const isAssetCriticalityEnabled = await assetCriticalityService.isEnabled();
  if (!isAssetCriticalityEnabled) {
    return results.map(({ result, identifier }) =>
      formatForResponse({ result, identifier, now, identifierField, includeNewFields: false })
    );
  }

  const identifiers = results.map(({ identifier }) => ({
    id_field: identifierField,
    id_value: identifier,
  }));

  let criticalities: AssetCriticalityRecord[] = [];
  try {
    criticalities = await assetCriticalityService.getCriticalitiesByIdentifiers(identifiers);
  } catch (e) {
    logger.warn(
      `Error retrieving criticality: ${e}. Scoring will proceed without criticality information.`
    );
  }

  return results.map(({ identifier, result }) => {
    const criticality = criticalities.find(
      (c) => c.id_field === identifierField && c.id_value === identifier
    );

    return formatForResponse({
      result,
      identifier,
      criticality,
      identifierField,
      now,
      includeNewFields: true,
    });
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
    const scriptedMetricPainless = await getPainlessScripts();
    const filter = [
      filterFromRange(range),
      { bool: { must_not: { term: { [ALERT_WORKFLOW_STATUS]: 'closed' } } } },
      { exists: { field: ALERT_RISK_SCORE } },
    ];
    if (!_.isEmpty(userFilter)) {
      filter.push(userFilter as QueryDslQueryContainer);
    }
    const identifierTypes: IdentifierType[] = identifierType ? [identifierType] : ['host', 'user'];
    const request = {
      size: 0,
      _source: false,
      index,
      runtime_mappings: runtimeMappings,
      query: {
        function_score: {
          query: {
            bool: {
              filter,
              should: [
                {
                  match_all: {}, // This forces ES to calculate score
                },
              ],
            },
          },
          field_value_factor: {
            field: ALERT_RISK_SCORE, // sort by risk score
          },
        },
      },
      aggs: identifierTypes.reduce((aggs, _identifierType) => {
        aggs[_identifierType] = buildIdentifierTypeAggregation({
          afterKeys: userAfterKeys,
          identifierType: _identifierType,
          pageSize,
          weights,
          alertSampleSizePerShard,
          scriptedMetricPainless,
        });
        return aggs;
      }, {} as Record<string, AggregationsAggregationContainer>),
    };

    if (debug) {
      logger.info(`Executing Risk Score query:\n${JSON.stringify(request)}`);
    }

    const response = await esClient.search<never, CalculateRiskScoreAggregations>(request);

    if (debug) {
      logger.info(`Received Risk Score response:\n${JSON.stringify(response)}`);
    }

    if (response.aggregations == null) {
      return {
        ...(debug ? { request, response } : {}),
        after_keys: {},
        scores: {
          host: [],
          user: [],
        },
      };
    }

    const userResults = await calculateScores({
      weights,
      identifierType: 'user',
      searchResponse: response,
    });
    const hostResults = await calculateScores({
      weights,
      identifierType: 'host',
      searchResponse: response,
    });

    const afterKeys = {
      host: response.aggregations.host?.after_key,
      user: response.aggregations.user?.after_key,
    };

    const hostScores = await processScores({
      assetCriticalityService,
      results: hostResults,
      identifierField: 'host.name',
      logger,
      now,
    });
    const userScores = await processScores({
      assetCriticalityService,
      results: userResults,
      identifierField: 'user.name',
      logger,
      now,
    });

    return {
      ...(debug ? { request, response } : {}),
      after_keys: afterKeys,
      scores: {
        host: hostScores,
        user: userScores,
      },
    };
  });
