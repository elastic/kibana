/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import {
  getTotalIndicesStats,
  getEstimatedSizeForDocumentsInIndex,
} from './indices_stats_helpers';
import { Setup } from '../../lib/helpers/setup_request';
import { ApmPluginRequestHandlerContext } from '../typings';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer_types';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import {
  SERVICE_NAME,
  TIER,
  INDEX,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
  getDurationFieldForTransactions,
  isRootTransaction,
} from '../../lib/helpers/transactions';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';

export async function getTracesPerMinute({
  setup,
  indexLifecyclePhase,
  start,
  end,
  environment,
  kuery,
  searchAggregatedTransactions,
}: {
  setup: Setup;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  searchAggregatedTransactions: boolean;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_traces_per_minute', {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForTransactions(
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
            isRootTransaction(searchAggregatedTransactions),
          ],
        },
      },
      aggs: {
        traces_count: {
          value_count: {
            field: getDurationFieldForTransactions(
              searchAggregatedTransactions
            ),
          },
        },
      },
    },
  });

  return calculateThroughputWithRange({
    start,
    end,
    value: response?.aggregations?.traces_count.value ?? 0,
  });
}

export async function getMainSummaryStats({
  setup,
  context,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
}: {
  setup: Setup;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}) {
  const { apmEventClient } = setup;

  const [{ indices: allIndicesStats }, res] = await Promise.all([
    getTotalIndicesStats({ context, setup }),
    apmEventClient.search('get_storage_explorer_main_summary_stats', {
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
            ] as QueryDslQueryContainer[],
          },
        },
        aggs: {
          services_count: {
            cardinality: {
              field: SERVICE_NAME,
            },
          },
          sample: {
            random_sampler: randomSampler,
            aggs: {
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
            },
          },
        },
      },
    }),
  ]);

  const estimatedSize = allIndicesStats
    ? res.aggregations?.sample.indices.buckets.reduce((prev, curr) => {
        return (
          prev +
          getEstimatedSizeForDocumentsInIndex({
            allIndicesStats,
            indexName: curr.key as string,
            numberOfDocs: curr.number_of_metric_docs.value,
          })
        );
      }, 0) ?? 0
    : 0;

  const durationAsDays = (end - start) / 1000 / 60 / 60 / 24;

  return {
    numberOfServices: res.aggregations?.services_count.value ?? 0,
    estimatedSize,
    dailyDataGeneration: estimatedSize / durationAsDays,
  };
}
