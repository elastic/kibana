/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
  METRICSET_INTERVAL,
  METRICSET_NAME,
  TRANSACTION_DURATION_SUMMARY,
} from '@kbn/apm-types/es_fields';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import { termQuery } from '@kbn/observability-utils-common/es/queries/term_query';
import { termsQuery } from '@kbn/observability-utils-common/es/queries/terms_query';
import { existsQuery } from '@kbn/observability-utils-common/es/queries/exists_query';
import { RollupInterval } from '../../../../common/rollup';
import { ApmDocumentType } from '../../../../common/document_type';
import type { APMEventClient } from '../create_es_client/create_apm_event_client';

// The function returns Document type filter for 1m Transaction Metrics
export function getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions: boolean) {
  return searchAggregatedTransactions
    ? [
        {
          bool: {
            filter: [...existsQuery(TRANSACTION_DURATION_HISTOGRAM)],
            must_not: [
              ...termsQuery(
                METRICSET_INTERVAL,
                RollupInterval.TenMinutes,
                RollupInterval.SixtyMinutes
              ),
              ...termQuery(METRICSET_NAME, 'service_transaction'),
            ],
          },
        },
      ]
    : [];
}

export function isDurationSummaryNotSupportedFilter(): QueryDslQueryContainer {
  return {
    bool: {
      must_not: [...existsQuery(TRANSACTION_DURATION_SUMMARY)],
    },
  };
}

export function isSummaryFieldSupportedByDocType(
  typeOrSearchAgggregatedTransactions:
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent
    | boolean
) {
  let type: ApmDocumentType;

  if (typeOrSearchAgggregatedTransactions === true) {
    type = ApmDocumentType.TransactionMetric;
  } else if (typeOrSearchAgggregatedTransactions === false) {
    type = ApmDocumentType.TransactionEvent;
  } else {
    type = typeOrSearchAgggregatedTransactions;
  }

  return (
    type === ApmDocumentType.ServiceTransactionMetric || type === ApmDocumentType.TransactionMetric
  );
}

export function getDurationFieldForTransactions(
  typeOrSearchAgggregatedTransactions:
    | ApmDocumentType.ServiceTransactionMetric
    | ApmDocumentType.TransactionMetric
    | ApmDocumentType.TransactionEvent
    | boolean,
  useDurationSummaryField?: boolean
) {
  if (isSummaryFieldSupportedByDocType(typeOrSearchAgggregatedTransactions)) {
    if (useDurationSummaryField) {
      return TRANSACTION_DURATION_SUMMARY;
    }
    return TRANSACTION_DURATION_HISTOGRAM;
  }

  return TRANSACTION_DURATION;
}

export async function getHasTransactionsEvents({
  start,
  end,
  apmEventClient,
  kuery,
}: {
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery?: string;
}) {
  const response = await apmEventClient.search('get_has_aggregated_transactions', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    track_total_hits: 1,
    terminate_after: 1,
    size: 0,
    query: {
      bool: {
        filter: [
          { exists: { field: TRANSACTION_DURATION_HISTOGRAM } },
          ...(start && end ? rangeQuery(start, end) : []),
          ...kqlQuery(kuery),
        ],
      },
    },
  });

  return response.hits.total.value > 0;
}
