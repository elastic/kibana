/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ALERT_RISK_SCORE,
  EVENT_KIND,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { withSecuritySpan } from '../../utils/with_security_span';
import {
  buildCategoryScoreDeclarations,
  buildCategoryWeightAccounting,
  getGlobalWeightForIdentifierType,
} from './category_weights';
import type {
  CalculateRiskScoreAggregations,
  FullRiskScore,
  GetScoresParams,
  GetScoresResponse,
  IdentifierType,
  RiskScoreBucket,
  RiskScoreWeight,
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
  identifierValue: bucket.key[identifierField],
  level: bucket.risk_details.value.level,
  totalScore: bucket.risk_details.value.score,
  totalScoreNormalized: bucket.risk_details.value.normalized_score,
  alertsScore: bucket.risk_details.value.signals_score,
  otherScore: bucket.risk_details.value.other_score,
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

const buildReduceScript = ({
  globalIdentifierTypeWeight,
  identifierType,
  weights,
}: {
  globalIdentifierTypeWeight?: number;
  identifierType: IdentifierType;
  weights?: RiskScoreWeight[];
}): string => {
  return `
    Map results = new HashMap();
    List inputs = [];
    for (state in states) {
      inputs.addAll(state.inputs)
    }
    Collections.sort(inputs, (a, b) -> b.get('score').compareTo(a.get('score')));

    double num_inputs_to_score = Math.min(inputs.length, params.max_risk_inputs_per_identity);
    results['notes'] = [];
    if (num_inputs_to_score == params.max_risk_inputs_per_identity) {
      results['notes'].add('Number of risk inputs (' + inputs.length + ') exceeded the maximum allowed (' + params.max_risk_inputs_per_identity + ').');
    }

    ${buildCategoryScoreDeclarations()}

    double total_score = 0;
    double current_score = 0;
    for (int i = 0; i < num_inputs_to_score; i++) {
      current_score = inputs[i].score / Math.pow(i + 1, params.p);

      ${buildCategoryWeightAccounting({ userWeights: weights, identifierType })}
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

const buildIdentifierTypeAggregation = (
  identifierType: IdentifierType,
  enrichInputs?: boolean,
  weights?: GetScoresParams['weights']
): SearchRequest['aggs'] => {
  const globalIdentifierTypeWeight = getGlobalWeightForIdentifierType({ identifierType, weights });
  const identifierField = getFieldForIdentifierAgg(identifierType);

  return {
    [identifierType]: {
      // per identity field, per category
      composite: {
        size: 65536, // TODO make a param,
        sources: [
          {
            [identifierField]: {
              terms: {
                field: identifierField,
              },
            },
          },
        ],
        after: undefined, // TODO make a param
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
            init_script: 'state.inputs = []',
            map_script: `
              Map fields = new HashMap();
              fields.put('score', doc['${ALERT_RISK_SCORE}'].value);
              fields.put('category', doc['${EVENT_KIND}'].value);
              fields.put('time', doc['@timestamp'].value);
              state.inputs.add(fields);
            `,
            combine_script: 'return state;',
            params: {
              max_risk_inputs_per_identity: 999999,
              p: 1.5,
              risk_cap: 261.2,
            },
            reduce_script: buildReduceScript({
              identifierType,
              globalIdentifierTypeWeight,
              weights,
            }),
          },
        },
      },
    },
  };
};

export const calculateRiskScores = async ({
  debug,
  enrichInputs,
  esClient,
  filter: userFilter,
  identifierType,
  index,
  logger,
  range,
  weights,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
} & GetScoresParams): Promise<GetScoresResponse> =>
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
      query: {
        bool: {
          filter,
        },
      },
      aggs: identifierTypes.reduce(
        (aggs, _identifierType) => ({
          ...aggs,
          ...buildIdentifierTypeAggregation(_identifierType, enrichInputs, weights),
        }),
        {}
      ),
    };

    if (debug) {
      logger.info(`Executing Risk Score query:\n${JSON.stringify(request)}`);
    }

    const response = await esClient.search<never, CalculateRiskScoreAggregations>(request);

    if (debug) {
      logger.info(`Received Risk Score response:\n${JSON.stringify(response)}`);
    }

    if (response.aggregations == null) {
      return { ...(debug ? { request, response } : {}), scores: [] };
    }

    const userBuckets = response.aggregations.user?.buckets ?? [];
    const hostBuckets = response.aggregations.host?.buckets ?? [];

    const scores = userBuckets
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

    return {
      ...(debug ? { request, response } : {}),
      scores,
    };
  });
