/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsSumAggregation,
  AggregationsValueCountAggregation,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  AggregationOptionsByType,
  AggregationResultOf,
  AggregationResultOfMap,
} from '@kbn/es-types';
import { ApmDocumentType } from '../../../common/document_type';
import {
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
} from '../../../common/es_fields/apm';
import { EventOutcome } from '../../../common/event_outcome';

export const getOutcomeAggregation = (
  documentType: ApmDocumentType
): {
  successful_or_failed:
    | { value_count: AggregationsValueCountAggregation }
    | { filter: QueryDslQueryContainer };
  successful:
    | { sum: AggregationsSumAggregation }
    | { filter: QueryDslQueryContainer };
} => {
  if (documentType === ApmDocumentType.ServiceTransactionMetric) {
    return {
      successful_or_failed: {
        value_count: {
          field: EVENT_SUCCESS_COUNT,
        },
      },
      successful: {
        sum: {
          field: EVENT_SUCCESS_COUNT,
        },
      },
    };
  }

  return {
    successful_or_failed: {
      filter: {
        bool: {
          filter: [
            {
              terms: {
                [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
              },
            },
          ],
        },
      },
    },
    successful: {
      filter: {
        bool: {
          filter: [
            {
              terms: {
                [EVENT_OUTCOME]: [EventOutcome.success],
              },
            },
          ],
        },
      },
    },
  };
};

type OutcomeAggregation = ReturnType<typeof getOutcomeAggregation>;

export function calculateFailedTransactionRate(
  outcomeResponse: AggregationResultOfMap<OutcomeAggregation, {}>
) {
  const successfulTransactions =
    'value' in outcomeResponse.successful
      ? outcomeResponse.successful.value ?? 0
      : outcomeResponse.successful.doc_count;

  const successfulOrFailedTransactions =
    'value' in outcomeResponse.successful_or_failed
      ? outcomeResponse.successful_or_failed.value
      : outcomeResponse.successful_or_failed.doc_count;

  const failedTransactions =
    successfulOrFailedTransactions - successfulTransactions;

  return failedTransactions / successfulOrFailedTransactions;
}

export function getFailedTransactionRateTimeSeries(
  buckets: AggregationResultOf<
    {
      date_histogram: AggregationOptionsByType['date_histogram'];
      aggs: OutcomeAggregation;
    },
    {}
  >['buckets']
) {
  return buckets.map((dateBucket) => {
    return {
      x: dateBucket.key,
      y: calculateFailedTransactionRate(dateBucket),
    };
  });
}
