/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { APMConfig } from '../../..';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import { ApmDocumentType } from '../../../../common/document_type';
import {
  METRICSET_INTERVAL,
  METRICSET_NAME,
  PARENT_ID,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_ROOT,
} from '../../../../common/es_fields/apm';
import { APMEventClient } from '../create_es_client/create_apm_event_client';

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
    body: {
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
    },
  });

  return response.hits.total.value > 0;
}

export async function getSearchTransactionsEvents({
  config,
  start,
  end,
  apmEventClient,
  kuery,
}: {
  config: APMConfig;
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery?: string;
}): Promise<boolean> {
  switch (config.searchAggregatedTransactions) {
    case SearchAggregatedTransactionSetting.always:
      return kuery ? getHasTransactionsEvents({ start, end, apmEventClient, kuery }) : true;

    case SearchAggregatedTransactionSetting.auto:
      return getHasTransactionsEvents({
        start,
        end,
        apmEventClient,
        kuery,
      });

    case SearchAggregatedTransactionSetting.never:
      return false;
  }
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

// The function returns Document type filter for 1m Transaction Metrics
export function getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions: boolean) {
  return searchAggregatedTransactions
    ? [
        {
          bool: {
            filter: [{ exists: { field: TRANSACTION_DURATION_HISTOGRAM } }],
            must_not: [
              { terms: { [METRICSET_INTERVAL]: ['10m', '60m'] } },
              { term: { [METRICSET_NAME]: 'service_transaction' } },
            ],
          },
        },
      ]
    : [];
}

export function getProcessorEventForTransactions(
  searchAggregatedTransactions: boolean
): ProcessorEvent.metric | ProcessorEvent.transaction {
  return searchAggregatedTransactions ? ProcessorEvent.metric : ProcessorEvent.transaction;
}

export function isRootTransaction(searchAggregatedTransactions: boolean) {
  return searchAggregatedTransactions
    ? {
        term: {
          [TRANSACTION_ROOT]: true,
        },
      }
    : {
        bool: {
          must_not: {
            exists: { field: PARENT_ID },
          },
        },
      };
}

export function isDurationSummaryNotSupportedFilter(): QueryDslQueryContainer {
  return {
    bool: {
      must_not: [{ exists: { field: TRANSACTION_DURATION_SUMMARY } }],
    },
  };
}
