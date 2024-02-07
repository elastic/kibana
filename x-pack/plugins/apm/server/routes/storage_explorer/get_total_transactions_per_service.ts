/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import {
  getProcessorEventForTransactions,
  getBackwardCompatibleDocumentTypeFilter,
} from '../../lib/helpers/transactions';
import { SERVICE_NAME, TIER } from '../../../common/es_fields/apm';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTotalTransactionsPerService({
  apmEventClient,
  searchAggregatedTransactions,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}) {
  const response = await apmEventClient.search(
    'get_total_transactions_per_service',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              ...getBackwardCompatibleDocumentTypeFilter(
                searchAggregatedTransactions
              ),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...rangeQuery(start, end),
              ...(indexLifecyclePhase !== IndexLifecyclePhaseSelectOption.All
                ? termQuery(
                    TIER,
                    indexLifeCyclePhaseToDataTier[indexLifecyclePhase]
                  )
                : []),
            ],
          },
        },
        aggs: {
          sample: {
            random_sampler: randomSampler,
            aggs: {
              services: {
                terms: {
                  field: SERVICE_NAME,
                  size: 500,
                },
              },
            },
          },
        },
      },
    }
  );

  return (
    response.aggregations?.sample.services.buckets.reduce(
      (transactionsPerService, bucket) => {
        transactionsPerService[bucket.key as string] = bucket.doc_count;
        return transactionsPerService;
      },
      {} as Record<string, number>
    ) ?? {}
  );
}
