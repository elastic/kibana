/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_RISK_SCORE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type {
  CalculateRiskScoreAggregations,
  FullRiskScore,
  GetScoresParams,
  RiskScoreBucket,
  SimpleRiskScore,
} from './types';

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
  riskiestInputs: enrichInputs
    ? bucket.riskiest_inputs.hits.hits
    : bucket.riskiest_inputs.hits.hits.map((riskInput) => ({
        _id: riskInput._id,
        _index: riskInput._index,
        sort: riskInput.sort,
      })),
});

const filterFromRange = (range?: GetScoresParams['range']): QueryDslQueryContainer[] => {
  if (!range) return [];
  return [{ range: { '@timestamp': { lt: range.end, gte: range.start } } }];
};

export const calculateRiskScores = async ({
  dataViewId,
  enrichInputs,
  esClient,
  filters,
  identifierType,
  range,
}: {
  esClient: ElasticsearchClient;
} & GetScoresParams): Promise<SimpleRiskScore[] | FullRiskScore[]> => {
  const now = new Date().toISOString();
  const index = '.alerts-security*';

  const reduceScript = `
    Map results = new HashMap();
    List scores = [];
    for (state in states) {
      scores.addAll(state.scores)
    }
    Collections.sort(scores, Collections.reverseOrder());
    double max_score = scores[0];
    double total_score = 0;
    for (int i = 0; i < Math.min(scores.length, 999999); i++) {
      total_score += scores[i] / Math.pow(i + 1, params.p)
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

  const filter = ((filters ?? []) as QueryDslQueryContainer[]).concat(filterFromRange(range)); // TODO better typings

  const results = await esClient.search<never, CalculateRiskScoreAggregations>({
    size: 0,
    index,
    query: {
      bool: {
        must: { exists: { field: ALERT_RISK_SCORE } },
        filter,
      },
    },
    aggs: {
      hosts: {
        terms: {
          field: 'host.name',
          size: 1000,
        },
        aggs: {
          riskiest_inputs: {
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
                p: 1.5,
                risk_cap: 261.2,
              },
              reduce_script: reduceScript,
            },
          },
        },
      },
      users: {
        terms: {
          field: 'user.name',
          size: 1000,
        },
        aggs: {
          riskiest_inputs: {
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
              init_script: `state.scores = []`,
              map_script: `state.scores.add(doc['${ALERT_RISK_SCORE}'].value)`,
              combine_script: 'return state',
              params: {
                p: 1.5,
                risk_cap: 261.2,
              },
              reduce_script: reduceScript,
            },
          },
        },
      },
    },
  });

  if (results.aggregations == null) {
    return [];
  }

  const {
    users: { buckets: userBuckets },
    hosts: { buckets: hostBuckets },
  } = results.aggregations;

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
