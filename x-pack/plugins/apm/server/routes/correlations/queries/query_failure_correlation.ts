/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from 'kibana/server';
import { CorrelationsParams } from '../../../../common/correlations/types';
import { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import { fetchTransactionDurationRanges } from './query_ranges';
import { getQueryWithParams, getTermsQuery } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getFailureCorrelationRequest = (
  params: CorrelationsParams,
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
        ...[
          getTermsQuery({
            fieldName: EVENT_OUTCOME,
            fieldValue: EventOutcome.failure,
          }),
        ],
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

interface Aggs extends estypes.AggregationsSignificantLongTermsAggregate {
  doc_count: number;
  bg_count: number;
  buckets: estypes.AggregationsSignificantLongTermsBucket[];
}

export const fetchFailedTransactionsCorrelationPValues = async (
  esClient: ElasticsearchClient,
  params: CorrelationsParams,
  histogramRangeSteps: number[],
  fieldName: string
) => {
  const resp = await esClient.search<unknown, { failure_p_value: Aggs }>(
    getFailureCorrelationRequest(params, fieldName)
  );

  if (resp.aggregations === undefined) {
    throw new Error(
      'fetchErrorCorrelation failed, did not return aggregations.'
    );
  }

  const overallResult = resp.aggregations.failure_p_value;

  // Using for of to sequentially augment the results with histogram data.
  const result: FailedTransactionsCorrelation[] = [];
  for (const bucket of overallResult.buckets) {
    // Scale the score into a value from 0 - 1
    // using a concave piecewise linear function in -log(p-value)
    const normalizedScore =
      0.5 * Math.min(Math.max((bucket.score - 3.912) / 2.995, 0), 1) +
      0.25 * Math.min(Math.max((bucket.score - 6.908) / 6.908, 0), 1) +
      0.25 * Math.min(Math.max((bucket.score - 13.816) / 101.314, 0), 1);

    const histogram = await fetchTransactionDurationRanges(
      esClient,
      params,
      histogramRangeSteps,
      [{ fieldName, fieldValue: bucket.key }]
    );

    result.push({
      fieldName,
      fieldValue: bucket.key,
      doc_count: bucket.doc_count,
      bg_count: bucket.doc_count,
      score: bucket.score,
      pValue: Math.exp(-bucket.score),
      normalizedScore,
      // Percentage of time the term appears in failed transactions
      failurePercentage: bucket.doc_count / overallResult.doc_count,
      // Percentage of time the term appears in successful transactions
      successPercentage:
        (bucket.bg_count - bucket.doc_count) /
        (overallResult.bg_count - overallResult.doc_count),
      histogram,
    });
  }

  return result;
};
