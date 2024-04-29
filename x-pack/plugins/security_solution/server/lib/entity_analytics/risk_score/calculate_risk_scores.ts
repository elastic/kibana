/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERT_RISK_SCORE,
  ALERT_RULE_NAME,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  type AfterKeys,
  type IdentifierType,
  type RiskWeights,
  type RiskScore,
  getRiskLevel,
  RiskCategories,
} from '../../../../common/entity_analytics/risk_engine';
import { withSecuritySpan } from '../../../utils/with_security_span';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import {
  applyCriticalityToScore,
  getCriticalityModifier,
  normalize,
} from '../asset_criticality/helpers';
import { getAfterKeyForIdentifierType, getFieldForIdentifierAgg } from './helpers';
import {
  buildCategoryCountDeclarations,
  buildCategoryAssignment,
  buildCategoryScoreDeclarations,
  buildWeightingOfScoreByCategory,
  getGlobalWeightForIdentifierType,
} from './risk_weights';
import type {
  CalculateRiskScoreAggregations,
  CalculateScoresParams,
  CalculateScoresResponse,
  RiskScoreBucket,
} from '../types';
import {
  MAX_INPUTS_COUNT,
  RISK_SCORING_INPUTS_COUNT_MAX,
  RISK_SCORING_SUM_MAX,
  RISK_SCORING_SUM_VALUE,
} from './constants';

const formatForResponse = ({
  bucket,
  criticality,
  now,
  identifierField,
  includeNewFields,
}: {
  bucket: RiskScoreBucket;
  criticality?: AssetCriticalityRecord;
  now: string;
  identifierField: string;
  includeNewFields: boolean;
}): RiskScore => {
  const riskDetails = bucket.top_inputs.risk_details;

  const criticalityModifier = getCriticalityModifier(criticality?.criticality_level);
  const normalizedScoreWithCriticality = applyCriticalityToScore({
    score: riskDetails.value.normalized_score,
    modifier: criticalityModifier,
  });
  const calculatedLevel = getRiskLevel(normalizedScoreWithCriticality);
  const categoryTwoScore = normalizedScoreWithCriticality - riskDetails.value.normalized_score;
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
    id_value: bucket.key[identifierField],
    calculated_level: calculatedLevel,
    calculated_score: riskDetails.value.score,
    calculated_score_norm: normalizedScoreWithCriticality,
    category_1_score: normalize({
      number: riskDetails.value.category_1_score,
      max: RISK_SCORING_SUM_MAX,
    }),
    category_1_count: riskDetails.value.category_1_count,
    notes: riskDetails.value.notes,
    inputs: riskDetails.value.risk_inputs.map((riskInput) => ({
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

const buildReduceScript = ({
  globalIdentifierTypeWeight,
}: {
  globalIdentifierTypeWeight?: number;
}): string => {
  return `
    Map results = new HashMap();
    List inputs = [];
    for (state in states) {
      inputs.addAll(state.inputs)
    }
    Collections.sort(inputs, (a, b) -> b.get('weighted_score').compareTo(a.get('weighted_score')));

    double num_inputs_to_score = Math.min(inputs.length, params.max_risk_inputs_per_identity);
    results['notes'] = [];
    if (num_inputs_to_score == params.max_risk_inputs_per_identity) {
      results['notes'].add('Number of risk inputs (' + inputs.length + ') exceeded the maximum allowed (' + params.max_risk_inputs_per_identity + ').');
    }

    ${buildCategoryScoreDeclarations()}
    ${buildCategoryCountDeclarations()}

    double total_score = 0;
    double current_score = 0;
    List risk_inputs = [];
    for (int i = 0; i < num_inputs_to_score; i++) {
      current_score = inputs[i].weighted_score / Math.pow(i + 1, params.p);

      if (i < ${MAX_INPUTS_COUNT}) {
        inputs[i]["contribution"] = 100 * current_score / params.risk_cap;
        risk_inputs.add(inputs[i]);
      }

      ${buildCategoryAssignment()}
      total_score += current_score;
    }

    ${globalIdentifierTypeWeight != null ? `total_score *= ${globalIdentifierTypeWeight};` : ''}
    double score_norm = 100 * total_score / params.risk_cap;
    results['score'] = total_score;
    results['normalized_score'] = score_norm;
    results['risk_inputs'] = risk_inputs;

    return results;
  `;
};

const buildIdentifierTypeAggregation = ({
  afterKeys,
  identifierType,
  pageSize,
  weights,
  alertSampleSizePerShard,
}: {
  afterKeys: AfterKeys;
  identifierType: IdentifierType;
  pageSize: number;
  weights?: RiskWeights;
  alertSampleSizePerShard: number;
}): AggregationsAggregationContainer => {
  const globalIdentifierTypeWeight = getGlobalWeightForIdentifierType({ identifierType, weights });
  const identifierField = getFieldForIdentifierAgg(identifierType);

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
        sampler: {
          shard_size: alertSampleSizePerShard,
        },

        aggs: {
          risk_details: {
            scripted_metric: {
              init_script: 'state.inputs = []',
              map_script: `
                Map fields = new HashMap();
                String category = doc['${EVENT_KIND}'].value;
                double score = doc['${ALERT_RISK_SCORE}'].value;
                double weighted_score = 0.0;
          
                fields.put('time', doc['@timestamp'].value);
                fields.put('rule_name', doc['${ALERT_RULE_NAME}'].value);

                fields.put('category', category);
                fields.put('index', doc['_index'].value);
                fields.put('id', doc['${ALERT_UUID}'].value);
                fields.put('score', score);
                
                ${buildWeightingOfScoreByCategory({ userWeights: weights, identifierType })}
                fields.put('weighted_score', weighted_score);
          
                state.inputs.add(fields);
              `,
              combine_script: 'return state;',
              params: {
                max_risk_inputs_per_identity: RISK_SCORING_INPUTS_COUNT_MAX,
                p: RISK_SCORING_SUM_VALUE,
                risk_cap: RISK_SCORING_SUM_MAX,
              },
              reduce_script: buildReduceScript({ globalIdentifierTypeWeight }),
            },
          },
        },
      },
    },
  };
};

const processScores = async ({
  assetCriticalityService,
  buckets,
  identifierField,
  logger,
  now,
}: {
  assetCriticalityService: AssetCriticalityService;
  buckets: RiskScoreBucket[];
  identifierField: string;
  logger: Logger;
  now: string;
}): Promise<RiskScore[]> => {
  if (buckets.length === 0) {
    return [];
  }

  const isAssetCriticalityEnabled = await assetCriticalityService.isEnabled();
  if (!isAssetCriticalityEnabled) {
    return buckets.map((bucket) =>
      formatForResponse({ bucket, now, identifierField, includeNewFields: false })
    );
  }

  const identifiers = buckets.map((bucket) => ({
    id_field: identifierField,
    id_value: bucket.key[identifierField],
  }));

  let criticalities: AssetCriticalityRecord[] = [];
  try {
    criticalities = await assetCriticalityService.getCriticalitiesByIdentifiers(identifiers);
  } catch (e) {
    logger.warn(
      `Error retrieving criticality: ${e}. Scoring will proceed without criticality information.`
    );
  }

  return buckets.map((bucket) => {
    const criticality = criticalities.find(
      (c) => c.id_field === identifierField && c.id_value === bucket.key[identifierField]
    );

    return formatForResponse({ bucket, criticality, identifierField, now, includeNewFields: true });
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
} & CalculateScoresParams): Promise<CalculateScoresResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const now = new Date().toISOString();
    const filter = [
      filterFromRange(range),
      { bool: { must_not: { term: { [ALERT_WORKFLOW_STATUS]: 'closed' } } } },
      { exists: { field: ALERT_RISK_SCORE } },
    ];
    if (!isEmpty(userFilter)) {
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

    const userBuckets = response.aggregations.user?.buckets ?? [];
    const hostBuckets = response.aggregations.host?.buckets ?? [];

    const afterKeys = {
      host: response.aggregations.host?.after_key,
      user: response.aggregations.user?.after_key,
    };

    const hostScores = await processScores({
      assetCriticalityService,
      buckets: hostBuckets,
      identifierField: 'host.name',
      logger,
      now,
    });
    const userScores = await processScores({
      assetCriticalityService,
      buckets: userBuckets,
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
