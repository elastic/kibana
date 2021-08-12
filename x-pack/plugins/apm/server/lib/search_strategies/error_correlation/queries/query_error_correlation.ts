/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from 'kibana/server';
import { SearchServiceFetchParams } from '../../../../../common/search_strategies/correlations/types';
import {
  getQueryWithParams,
  getTermsQuery,
} from '../../correlations/queries/get_query_with_params';
import { getRequestBase } from '../../correlations/queries/get_request_base';
import { EVENT_OUTCOME } from '../../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../../common/event_outcome';

export const getErrorCorrelationRequest = (
  params: SearchServiceFetchParams,
  fieldName: string
): estypes.SearchRequest => {
  const query = getQueryWithParams({
    params,
  });

  const queryWithFailure = {
    ...query,
    bool: {
      ...query.bool,
      filter: [
        ...query.bool.filter,
        ...getTermsQuery(EVENT_OUTCOME, EventOutcome.failure),
      ],
    },
  };

  const body = {
    query: queryWithFailure,
    size: 0,
    aggs: {
      failure_p_value: {
        significant_terms: {
          field: fieldName,
          background_filter: {
            // Important to have same query as above here
            // without it, we would be comparing sets of different filtered elements
            ...query,
          },
          // No need to have must_not "event.outcome": "failure" clause
          // if background_is_superset is set to true
          p_value: { background_is_superset: true },
        },
      },
    },
  };

  return {
    ...getRequestBase(params),
    body,
  };
};

export const fetchFailedTransactionsCorrelationPValues = async (
  esClient: ElasticsearchClient,
  params: SearchServiceFetchParams,
  fieldName: string
) => {
  const resp = await esClient.search(
    getErrorCorrelationRequest(params, fieldName)
  );

  if (resp.body.aggregations === undefined) {
    throw new Error(
      'fetchErrorCorrelation failed, did not return aggregations.'
    );
  }

  const result = (resp.body.aggregations
    .failure_p_value as estypes.AggregationsMultiBucketAggregate<{
    key: string;
    doc_count: number;
    bg_count: number;
    score: number;
  }>).buckets.map((b) => {
    const score = b.score;
    const normalizedScore =
      0.5 * Math.min(Math.max((score - 3.912) / 2.995, 0), 1) +
      0.25 * Math.min(Math.max((score - 6.908) / 6.908, 0), 1) +
      0.25 * Math.min(Math.max((score - 13.816) / 101.314, 0), 1);

    return {
      ...b,
      fieldName,
      fieldValue: b.key,
      p_value: Math.exp(-score),
      normalized_score: normalizedScore,
    };
  });

  return result;
};
