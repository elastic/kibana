/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  TRANSACTION_DURATION_HISTOGRAM,
  METRICSET_INTERVAL,
  METRICSET_NAME,
  TRANSACTION_DURATION_SUMMARY,
} from '@kbn/apm-types/es_fields';
import { existsQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import { RollupInterval } from '../../../../common/rollup';

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
