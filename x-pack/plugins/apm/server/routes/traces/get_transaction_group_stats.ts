/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { Setup } from '../../lib/helpers/setup_request';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_ROOT,
} from '../../../common/elasticsearch_fieldnames';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '../../../../observability/server';
import {
  getDurationFieldForTransactions,
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../common/utils/environment_query';
import { BucketKey } from './get_top_traces';
export interface TopTracesParams {
  environment: string;
  kuery: string;
  transactionName?: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  setup: Setup;
}

export async function getTransactionGroupStats({
  setup,
  searchAggregatedTransactions,
  environment,
  kuery,
  transactionName,
  start,
  end,
}: TopTracesParams) {
  const response = await setup.apmEventClient.search(
    'get_transaction_group_stats',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...termQuery(TRANSACTION_NAME, transactionName),
              ...getDocumentTypeFilterForTransactions(
                searchAggregatedTransactions
              ),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...(searchAggregatedTransactions
                ? [
                    {
                      term: {
                        [TRANSACTION_ROOT]: true,
                      },
                    },
                  ]
                : []),
            ] as estypes.QueryDslQueryContainer[],
            must_not: [
              ...(!searchAggregatedTransactions
                ? [
                    {
                      exists: {
                        field: PARENT_ID,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        aggs: {
          transaction_groups: {
            composite: {
              sources: asMutableArray([
                { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
                {
                  [TRANSACTION_NAME]: {
                    terms: { field: TRANSACTION_NAME },
                  },
                },
              ] as const),
              // traces overview is hardcoded to 10000
              size: 10000,
            },
            aggs: {
              transaction_type: {
                top_metrics: {
                  sort: {
                    '@timestamp': 'desc' as const,
                  },
                  metrics: [
                    {
                      field: TRANSACTION_TYPE,
                    } as const,
                    {
                      field: AGENT_NAME,
                    } as const,
                  ],
                },
              },
              avg: {
                avg: {
                  field: getDurationFieldForTransactions(
                    searchAggregatedTransactions
                  ),
                },
              },
              sum: {
                sum: {
                  field: getDurationFieldForTransactions(
                    searchAggregatedTransactions
                  ),
                },
              },
            },
          },
        },
      },
    }
  );

  return response.aggregations?.transaction_groups.buckets.map((bucket) => {
    return {
      key: bucket.key as BucketKey,
      avg: bucket.avg.value,
      sum: bucket.sum.value,
      count: bucket.doc_count,
      transactionType: bucket.transaction_type.top[0].metrics[
        TRANSACTION_TYPE
      ] as string,
      agentName: bucket.transaction_type.top[0].metrics[
        AGENT_NAME
      ] as AgentName,
    };
  });
}
