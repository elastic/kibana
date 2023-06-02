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
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ApmPluginRequestHandlerContext } from '../typings';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer_types';
import { getTotalTransactionsPerService } from './get_total_transactions_per_service';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TIER,
  TRANSACTION_SAMPLED,
  AGENT_NAME,
  INDEX,
} from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import {
  getTotalIndicesStats,
  getEstimatedSizeForDocumentsInIndex,
} from './indices_stats_helpers';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

async function getMainServiceStatistics({
  apmEventClient,
  context,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
}: {
  apmEventClient: APMEventClient;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}) {
  const [{ indices: allIndicesStats }, response] = await Promise.all([
    getTotalIndicesStats({ context, apmEventClient }),
    apmEventClient.search('get_main_service_statistics', {
      apm: {
        events: [
          ProcessorEvent.span,
          ProcessorEvent.transaction,
          ProcessorEvent.error,
          ProcessorEvent.metric,
        ],
      },
      body: {
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
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
                aggs: {
                  sample: {
                    top_metrics: {
                      size: 1,
                      metrics: { field: AGENT_NAME },
                      sort: {
                        '@timestamp': 'desc',
                      },
                    },
                  },
                  indices: {
                    terms: {
                      field: INDEX,
                      size: 500,
                    },
                    aggs: {
                      number_of_metric_docs: {
                        value_count: {
                          field: INDEX,
                        },
                      },
                    },
                  },
                  environments: {
                    terms: {
                      field: SERVICE_ENVIRONMENT,
                    },
                  },
                  transactions: {
                    filter: {
                      term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction },
                    },
                    aggs: {
                      sampled_transactions: {
                        terms: {
                          field: TRANSACTION_SAMPLED,
                          size: 10,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const serviceStats = response.aggregations?.sample.services.buckets.map(
    (bucket) => {
      const estimatedSize = allIndicesStats
        ? bucket.indices.buckets.reduce((prev, curr) => {
            return (
              prev +
              getEstimatedSizeForDocumentsInIndex({
                allIndicesStats,
                indexName: curr.key as string,
                numberOfDocs: curr.number_of_metric_docs.value,
              })
            );
          }, 0)
        : 0;

      return {
        serviceName: bucket.key as string,
        environments: bucket.environments.buckets.map(
          ({ key }) => key as string
        ),
        sampledTransactionDocs:
          bucket.transactions.sampled_transactions.buckets[0]?.doc_count,
        size: estimatedSize,
        agentName: bucket.sample.top[0]?.metrics[AGENT_NAME] as AgentName,
      };
    }
  );

  return serviceStats ?? [];
}

export type StorageExplorerServiceStatisticsResponse = Array<{
  serviceName: string;
  sampling: number;
  environments: string[];
  size: number;
  agentName: AgentName;
}>;

export async function getServiceStatistics({
  apmEventClient,
  context,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
  searchAggregatedTransactions,
}: {
  apmEventClient: APMEventClient;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  searchAggregatedTransactions: boolean;
}): Promise<StorageExplorerServiceStatisticsResponse> {
  const [docCountPerProcessorEvent, totalTransactionsPerService] =
    await Promise.all([
      getMainServiceStatistics({
        apmEventClient,
        context,
        indexLifecyclePhase,
        randomSampler,
        environment,
        kuery,
        start,
        end,
      }),
      getTotalTransactionsPerService({
        apmEventClient,
        searchAggregatedTransactions,
        indexLifecyclePhase,
        randomSampler,
        environment,
        kuery,
        start,
        end,
      }),
    ]);

  const serviceStatistics = docCountPerProcessorEvent.map(
    ({ serviceName, sampledTransactionDocs, ...rest }) => {
      const sampling =
        sampledTransactionDocs && totalTransactionsPerService[serviceName]
          ? Math.min(
              sampledTransactionDocs / totalTransactionsPerService[serviceName],
              1
            )
          : 0;

      return {
        ...rest,
        serviceName,
        sampling,
      };
    }
  );

  return serviceStatistics;
}
