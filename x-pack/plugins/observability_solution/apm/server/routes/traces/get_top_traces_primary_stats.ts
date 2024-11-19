/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { withApmSpan } from '../../utils/with_apm_span';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../common/utils/environment_query';
import { calculateImpactBuilder } from './calculate_impact_builder';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import {
  getDurationFieldForTransactions,
  getBackwardCompatibleDocumentTypeFilter,
  getProcessorEventForTransactions,
  isRootTransaction,
} from '../../lib/helpers/transactions';
import {
  AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../../common/es_fields/apm';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export type BucketKey = Record<typeof TRANSACTION_NAME | typeof SERVICE_NAME, string>;

interface TopTracesParams {
  environment: string;
  kuery: string;
  transactionName?: string;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  apmEventClient: APMEventClient;
  randomSampler: RandomSampler;
}

export interface TopTracesPrimaryStatsResponse {
  // sort by impact by default so most impactful services are not cut off
  items: Array<{
    key: BucketKey;
    serviceName: string;
    transactionName: string;
    averageResponseTime: number | null;
    transactionsPerMinute: number;
    transactionType: string;
    impact: number;
    agentName: AgentName;
  }>;
}
export async function getTopTracesPrimaryStats({
  environment,
  kuery,
  transactionName,
  searchAggregatedTransactions,
  start,
  end,
  apmEventClient,
  randomSampler,
}: TopTracesParams): Promise<TopTracesPrimaryStatsResponse> {
  return withApmSpan('get_top_traces_primary_stats', async () => {
    const response = await apmEventClient.search('get_transaction_group_stats', {
      apm: {
        events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...termQuery(TRANSACTION_NAME, transactionName),
              ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              isRootTransaction(searchAggregatedTransactions),
            ],
          },
        },
        aggs: {
          sample: {
            random_sampler: randomSampler,
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
                      field: getDurationFieldForTransactions(searchAggregatedTransactions),
                    },
                  },
                  sum: {
                    sum: {
                      field: getDurationFieldForTransactions(searchAggregatedTransactions),
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const calculateImpact = calculateImpactBuilder(
      response.aggregations?.sample.transaction_groups.buckets.map(({ sum }) => sum.value)
    );

    const items = response.aggregations?.sample.transaction_groups.buckets.map((bucket) => {
      return {
        key: bucket.key as BucketKey,
        serviceName: bucket.key[SERVICE_NAME] as string,
        transactionName: bucket.key[TRANSACTION_NAME] as string,
        averageResponseTime: bucket.avg.value,
        transactionsPerMinute: calculateThroughputWithRange({
          start,
          end,
          value: bucket.doc_count ?? 0,
        }),
        transactionType: bucket.transaction_type.top[0].metrics[TRANSACTION_TYPE] as string,
        impact: calculateImpact(bucket.sum.value ?? 0),
        agentName: bucket.transaction_type.top[0].metrics[AGENT_NAME] as AgentName,
      };
    });

    return {
      // sort by impact by default so most impactful services are not cut off
      items: sortBy(items, 'impact').reverse(),
    };
  });
}
