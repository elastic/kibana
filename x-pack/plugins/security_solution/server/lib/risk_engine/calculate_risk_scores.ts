/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_RISK_SCORE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type {
  CalculateRiskScoreAggregations,
  FullRiskScore,
  GetScoresParams,
  IdentifierType,
  RiskScoreBucket,
  SimpleRiskScore,
} from './types';

const getFieldForIdentifierAgg = (identifierType: IdentifierType): string =>
  identifierType === 'host' ? 'host.name' : 'user.name';

const bucketToResponse = ({
  bucket,
  enrichInputs,
  now,
  identifierField,
}: {
  bucket: RiskScoreBucket;
  enrichInputs?: boolean;
  now: string;
  identifierField: string;
}): SimpleRiskScore | FullRiskScore => ({
  '@timestamp': now,
  identifierField,
  identifierValue: bucket.key,
  calculatedLevel: bucket.risk_details.value.level,
  calculatedScore: bucket.risk_details.value.score,
  calculatedScoreNorm: bucket.risk_details.value.normalized_score,
  notes: bucket.risk_details.value.notes,
  riskiestInputs: enrichInputs
    ? bucket.riskiest_inputs.hits.hits
    : bucket.riskiest_inputs.hits.hits.map((riskInput) => ({
        _id: riskInput._id,
        _index: riskInput._index,
        sort: riskInput.sort,
      })),
});

const filterFromRange = (range: GetScoresParams['range']): QueryDslQueryContainer => ({
  range: { '@timestamp': { lt: range.end, gte: range.start } },
});

const reduceScript = `
    Map results = new HashMap();
    List scores = [];
    for (state in states) {
      scores.addAll(state.scores)
    }
    Collections.sort(scores, Collections.reverseOrder());

    double num_inputs_to_score = Math.min(scores.length, params.max_risk_inputs_per_identity);
    results['notes'] = [];
    if (num_inputs_to_score == params.max_risk_inputs_per_identity) {
      results['notes'].add('Number of risk inputs (' + scores.length + ') exceeded the maximum allowed (' + params.max_risk_inputs_per_identity + ').');
    }

    double total_score = 0;
    for (int i = 0; i < num_inputs_to_score; i++) {
      total_score += scores[i] / Math.pow(i + 1, params.p);
    }
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

const buildIdentifierTypeAggregation = (
  identifierType: IdentifierType,
  enrichInputs?: boolean
): SearchRequest['aggs'] => ({
  [identifierType]: {
    terms: {
      field: getFieldForIdentifierAgg(identifierType),
      size: 1000,
    },
    aggs: {
      riskiest_inputs: {
        // TODO top_metrics would be faster if enrichInputs is false
        top_hits: {
          size: 30,
          sort: [
            {
              [ALERT_RISK_SCORE]: {
                order: 'desc',
              },
            },
          ],
          _source: enrichInputs,
        },
      },
      risk_details: {
        scripted_metric: {
          init_script: 'state.scores = []',
          map_script: `state.scores.add(doc['${ALERT_RISK_SCORE}'].value)`,
          combine_script: 'return state',
          params: {
            max_risk_inputs_per_identity: 999999,
            p: 1.5,
            risk_cap: 261.2,
          },
          reduce_script: reduceScript,
        },
      },
    },
  },
});

export const calculateRiskScores = async ({
  index,
  enrichInputs,
  esClient,
  filter: userFilter,
  identifierType,
  range,
}: {
  esClient: ElasticsearchClient;
} & GetScoresParams): Promise<SimpleRiskScore[] | FullRiskScore[]> => {
  const now = new Date().toISOString();

  const filter = [{ exists: { field: ALERT_RISK_SCORE } }, filterFromRange(range)];
  if (userFilter) {
    filter.push(userFilter as QueryDslQueryContainer);
  }
  const identifierTypes: IdentifierType[] = identifierType ? [identifierType] : ['host', 'user'];

  const results = await esClient.search<never, CalculateRiskScoreAggregations>({
    size: 0,
    _source: false,
    index,
    query: {
      bool: {
        filter,
      },
    },
    aggs: identifierTypes.reduce(
      (aggs, _identifierType) => ({ ...aggs, ...buildIdentifierTypeAggregation(_identifierType) }),
      {}
    ),
  });

  if (results.aggregations == null) {
    return [];
  }

  const userBuckets = results.aggregations.user?.buckets ?? [];
  const hostBuckets = results.aggregations.host?.buckets ?? [];

  return userBuckets
    .map((bucket) =>
      bucketToResponse({
        bucket,
        enrichInputs,
        identifierField: 'user.name',
        now,
      })
    )
    .concat(
      hostBuckets.map((bucket) =>
        bucketToResponse({
          bucket,
          enrichInputs,
          identifierField: 'host.name',
          now,
        })
      )
    );
};
