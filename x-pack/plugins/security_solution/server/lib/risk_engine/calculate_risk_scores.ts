/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERT_RISK_SCORE,
  ALERT_RULE_NAME,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type {
  AfterKeys,
  IdentifierType,
  RiskWeights,
  RiskScore,
} from '../../../common/risk_engine';
import { RiskCategories } from '../../../common/risk_engine';
import { withSecuritySpan } from '../../utils/with_security_span';
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
} from './types';

const bucketToResponse = ({
  bucket,
  now,
  identifierField,
}: {
  bucket: RiskScoreBucket;
  now: string;
  identifierField: string;
}): RiskScore => ({
  '@timestamp': now,
  id_field: identifierField,
  id_value: bucket.key[identifierField],
  calculated_level: bucket.risk_details.value.level,
  calculated_score: bucket.risk_details.value.score,
  calculated_score_norm: bucket.risk_details.value.normalized_score,
  category_1_score: bucket.risk_details.value.category_1_score,
  category_1_count: bucket.risk_details.value.category_1_count,
  notes: bucket.risk_details.value.notes,
  inputs: bucket.inputs.hits.hits.map((riskInput) => ({
    id: riskInput._id,
    index: riskInput._index,
    description: `Alert from Rule: ${riskInput.fields?.[ALERT_RULE_NAME]?.[0] ?? 'RULE_NOT_FOUND'}`,
    category: RiskCategories.category_1,
    risk_score: riskInput.fields?.[ALERT_RISK_SCORE]?.[0] ?? undefined,
    timestamp: riskInput.fields?.['@timestamp']?.[0] ?? undefined,
  })),
});

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
    for (int i = 0; i < num_inputs_to_score; i++) {
      current_score = inputs[i].weighted_score / Math.pow(i + 1, params.p);

      ${buildCategoryAssignment()}
      total_score += current_score;
    }

    ${globalIdentifierTypeWeight != null ? `total_score *= ${globalIdentifierTypeWeight};` : ''}
    double score_norm = 100 * total_score / params.risk_cap;
    results['score'] = total_score;
    results['normalized_score'] = score_norm;

    if (score_norm < 20) {
      results['level'] = 'Unknown'
    }
    else if (score_norm >= 20 && score_norm < 40) {
      results['level'] = 'Low'
    }
    else if (score_norm >= 40 && score_norm < 70) {
      results['level'] = 'Moderate'
    }
    else if (score_norm >= 70 && score_norm < 90) {
      results['level'] = 'High'
    }
    else if (score_norm >= 90) {
      results['level'] = 'Critical'
    }

    return results;
  `;
};

const buildIdentifierTypeAggregation = ({
  afterKeys,
  identifierType,
  pageSize,
  weights,
}: {
  afterKeys: AfterKeys;
  identifierType: IdentifierType;
  pageSize: number;
  weights?: RiskWeights;
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
      inputs: {
        top_hits: {
          size: 10,
          sort: { [ALERT_RISK_SCORE]: 'desc' },
          _source: false,
          docvalue_fields: ['@timestamp', ALERT_RISK_SCORE, ALERT_RULE_NAME],
        },
      },
      risk_details: {
        scripted_metric: {
          init_script: 'state.inputs = []',
          map_script: `
              Map fields = new HashMap();
              String category = doc['${EVENT_KIND}'].value;
              double score = doc['${ALERT_RISK_SCORE}'].value;
              double weighted_score = 0.0;

              fields.put('time', doc['@timestamp'].value);
              fields.put('category', category);
              fields.put('score', score);
              ${buildWeightingOfScoreByCategory({ userWeights: weights, identifierType })}
              fields.put('weighted_score', weighted_score);

              state.inputs.add(fields);
            `,
          combine_script: 'return state;',
          params: {
            max_risk_inputs_per_identity: 999999,
            p: 1.5,
            risk_cap: 261.2,
          },
          reduce_script: buildReduceScript({ globalIdentifierTypeWeight }),
        },
      },
    },
  };
};

export const calculateRiskScores = async ({
  afterKeys: userAfterKeys,
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
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
} & CalculateScoresParams): Promise<CalculateScoresResponse> =>
  withSecuritySpan('calculateRiskScores', async () => {
    const now = new Date().toISOString();

    const filter = [{ exists: { field: ALERT_RISK_SCORE } }, filterFromRange(range)];
    if (userFilter) {
      filter.push(userFilter as QueryDslQueryContainer);
    }
    const identifierTypes: IdentifierType[] = identifierType ? [identifierType] : ['host', 'user'];

    const request = {
      size: 0,
      _source: false,
      index,
      runtime_mappings: runtimeMappings,
      query: {
        bool: {
          filter,
        },
      },
      aggs: identifierTypes.reduce((aggs, _identifierType) => {
        aggs[_identifierType] = buildIdentifierTypeAggregation({
          afterKeys: userAfterKeys,
          identifierType: _identifierType,
          pageSize,
          weights,
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

    return {
      ...(debug ? { request, response } : {}),
      after_keys: afterKeys,
      scores: {
        host: hostBuckets.map((bucket) =>
          bucketToResponse({ bucket, identifierField: 'host.name', now })
        ),
        user: userBuckets.map((bucket) =>
          bucketToResponse({ bucket, identifierField: 'user.name', now })
        ),
      },
    };
  });
