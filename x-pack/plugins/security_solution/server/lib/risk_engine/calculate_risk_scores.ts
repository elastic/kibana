/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_RISK_SCORE } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import type { CalculateRiskScoreAggregations, GetScoresParams, RiskScores } from './types';

export const calculateRiskScores = async ({
  dataViewId,
  esClient,
  identifierType,
  range,
}: {
  esClient: ElasticsearchClient;
} & GetScoresParams): Promise<{ users: RiskScores; hosts: RiskScores }> => {
  const now = new Date().toISOString();
  const index = '.alerts-security*';

  const results = await esClient.search<never, CalculateRiskScoreAggregations>({
    size: 0,
    index,
    query: { bool: { must: { exists: { field: ALERT_RISK_SCORE } } } },
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
              _source: false,
            },
          },
          normalized_score: {
            scripted_metric: {
              init_script: 'state.scores = []',
              map_script: `state.scores.add(doc['${ALERT_RISK_SCORE}'].value)`,
              combine_script: 'return state',
              params: {
                p: 1.5,
                risk_cap: 261.2,
              },
              reduce_script: `
                List scores = [];
                for (state in states) {
                  scores.addAll(state.scores)
                }
                Collections.sort(scores, Collections.reverseOrder());
                double max_score = scores[0];
                double total_score = 0;
                for (int i = 0; i < scores.length; i++) {
                  total_score += scores[i] / Math.pow(i + 1, params.p)
                }
                double normalized_score = 100 * total_score / params.risk_cap;
                return normalized_score;
                `,
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
              _source: false,
            },
          },
          normalized_score: {
            scripted_metric: {
              init_script: 'state.scores = []',
              map_script: `state.scores.add(doc['${ALERT_RISK_SCORE}'].value)`,
              combine_script: 'return state',
              params: {
                p: 1.5,
                risk_cap: 261.2,
              },
              reduce_script: `
                List scores = [];
                for (state in states) {
                  scores.addAll(state.scores)
                }
                Collections.sort(scores, Collections.reverseOrder());
                double max_score = scores[0];
                double total_score = 0;
                for (int i = 0; i < scores.length; i++) {
                  total_score += scores[i] / Math.pow(i + 1, params.p)
                }
                double normalized_score = 100 * total_score / params.risk_cap;
                return normalized_score;
                `,
            },
          },
        },
      },
    },
  });

  if (results.aggregations == null) {
    return { users: [], hosts: [] };
  }

  return {
    users: results.aggregations.users.buckets.map((bucket) => ({
      '@timestamp': now,
      identifierField: 'user.name',
      identifierValue: bucket.key,
      calculatedScoreNorm: bucket.normalized_score.value,
      riskiestInputs: bucket.riskiest_inputs.hits.hits.map((riskInput) => ({
        _id: riskInput._id,
        _index: riskInput._index,
        score: riskInput.sort?.at(0),
      })),
    })),
    hosts: results.aggregations.hosts.buckets.map((bucket) => ({
      '@timestamp': now,
      identifierField: 'host.name',
      identifierValue: bucket.key,
      calculatedScoreNorm: bucket.normalized_score.value,
      riskiestInputs: bucket.riskiest_inputs.hits.hits.map((riskInput) => ({
        _id: riskInput._id,
        _index: riskInput._index,
        score: riskInput.sort?.at(0),
      })),
    })),
  };
};
