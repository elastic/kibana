/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsSumAggregation,
  AggregationsValueCountAggregation,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { AggregationResultOfMap } from '@kbn/es-types';
import { EVENT_OUTCOME, EVENT_SUCCESS_COUNT } from '@kbn/apm-types/es_fields';
import { ApmDocumentType } from '../../../common/document_type';

enum EventOutcome {
  success = 'success',
  failure = 'failure',
  unknown = 'unknown',
}

export const getOutcomeAggregation = (
  documentType: ApmDocumentType
): {
  successful_or_failed:
    | { value_count: AggregationsValueCountAggregation }
    | { filter: QueryDslQueryContainer };
  successful: { sum: AggregationsSumAggregation } | { filter: QueryDslQueryContainer };
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

export type OutcomeAggregation = ReturnType<typeof getOutcomeAggregation>;

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

  const failedTransactions = successfulOrFailedTransactions - successfulTransactions;

  return failedTransactions / successfulOrFailedTransactions;
}
