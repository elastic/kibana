/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getHasTransactionsEvents } from '@kbn/apm-data-access-plugin/server/utils';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import {
  TRANSACTION_ROOT,
  PARENT_ID,
  TRANSACTION_DURATION_SUMMARY,
} from '../../../../common/es_fields/apm';
import type { APMConfig } from '../../..';
import type { APMEventClient } from '../create_es_client/create_apm_event_client';

export {
  getBackwardCompatibleDocumentTypeFilter,
  isSummaryFieldSupportedByDocType,
  getDurationFieldForTransactions,
} from '@kbn/apm-data-access-plugin/server/utils';

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
