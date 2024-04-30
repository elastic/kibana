/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { TIER, SERVICE_NAME, INDEX } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getBucketSizeForAggregatedTransactions } from '../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer_types';
import { ApmPluginRequestHandlerContext } from '../typings';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { getTotalIndicesStats, getEstimatedSizeForDocumentsInIndex } from './indices_stats_helpers';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export type SizeTimeseriesResponse = Array<{
  serviceName: string;
  timeseries: Array<{ x: number; y: number }>;
}>;

export async function getSizeTimeseries({
  environment,
  kuery,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
  indexLifecyclePhase,
  randomSampler,
  context,
}: {
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  context: ApmPluginRequestHandlerContext;
}): Promise<SizeTimeseriesResponse> {
  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start,
    end,
    searchAggregatedTransactions,
  });

  const [{ indices: allIndicesStats }, res] = await Promise.all([
    getTotalIndicesStats({ apmEventClient, context }),
    apmEventClient.search('get_storage_timeseries', {
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
                ? termQuery(TIER, indexLifeCyclePhaseToDataTier[indexLifecyclePhase])
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
                  size: 50,
                },
                aggs: {
                  storageTimeSeries: {
                    date_histogram: {
                      field: '@timestamp',
                      fixed_interval: intervalString,
                      min_doc_count: 0,
                      extended_bounds: {
                        min: start,
                        max: end,
                      },
                    },
                    aggs: {
                      indices: {
                        terms: {
                          field: INDEX,
                          size: 500,
                        },
                        aggs: {
                          number_of_metric_docs_for_index: {
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
            },
          },
        },
      },
    }),
  ]);

  return (
    res.aggregations?.sample.services.buckets.map((serviceBucket) => {
      const timeseries = serviceBucket.storageTimeSeries.buckets.map((dateHistogramBucket) => {
        const estimatedSize = allIndicesStats
          ? dateHistogramBucket.indices.buckets.reduce((prev, curr) => {
              return (
                prev +
                getEstimatedSizeForDocumentsInIndex({
                  allIndicesStats,
                  indexName: curr.key as string,
                  numberOfDocs: curr.number_of_metric_docs_for_index.value,
                })
              );
            }, 0)
          : 0;

        return {
          x: dateHistogramBucket.key,
          y: estimatedSize,
        };
      });

      return {
        serviceName: serviceBucket.key as string,
        timeseries,
      };
    }) ?? []
  );
}
