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
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TIER,
  INDEX,
} from '../../../common/es_fields/apm';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ApmPluginRequestHandlerContext } from '../typings';
import {
  getTotalIndicesStats,
  getEstimatedSizeForDocumentsInIndex,
  getIndicesLifecycleStatus,
  getIndicesInfo,
} from './indices_stats_helpers';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getStorageDetailsPerProcessorEvent({
  apmEventClient,
  context,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  serviceName: string;
}) {
  const [{ indices: allIndicesStats }, response] = await Promise.all([
    getTotalIndicesStats({ apmEventClient, context }),
    apmEventClient.search('get_storage_details_per_processor_event', {
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
              ...termQuery(SERVICE_NAME, serviceName),
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
              processor_event: {
                terms: {
                  field: PROCESSOR_EVENT,
                  size: 10,
                },
                aggs: {
                  number_of_metric_docs_for_processor_event: {
                    value_count: {
                      field: PROCESSOR_EVENT,
                    },
                  },
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
    }),
  ]);

  return [
    ProcessorEvent.transaction,
    ProcessorEvent.span,
    ProcessorEvent.metric,
    ProcessorEvent.error,
  ].map((processorEvent) => {
    const bucketForProcessorEvent =
      response.aggregations?.sample.processor_event.buckets?.find(
        (x) => x.key === processorEvent
      );

    return {
      processorEvent,
      docs:
        bucketForProcessorEvent?.number_of_metric_docs_for_processor_event
          .value ?? 0,
      size:
        allIndicesStats && bucketForProcessorEvent
          ? bucketForProcessorEvent.indices.buckets.reduce((prev, curr) => {
              return (
                prev +
                getEstimatedSizeForDocumentsInIndex({
                  allIndicesStats,
                  indexName: curr.key as string,
                  numberOfDocs: curr.number_of_metric_docs_for_index.value,
                })
              );
            }, 0)
          : 0,
    };
  });
}

export async function getStorageDetailsPerIndex({
  apmEventClient,
  context,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
  serviceName,
}: {
  apmEventClient: APMEventClient;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  serviceName: string;
}) {
  const [
    { indices: allIndicesStats },
    indicesLifecycleStatus,
    indicesInfo,
    response,
  ] = await Promise.all([
    getTotalIndicesStats({ apmEventClient, context }),
    getIndicesLifecycleStatus({ apmEventClient, context }),
    getIndicesInfo({ apmEventClient, context }),
    apmEventClient.search('get_storage_details_per_index', {
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
              ...termQuery(SERVICE_NAME, serviceName),
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
    }),
  ]);

  return (
    response.aggregations?.sample.indices.buckets.map((bucket) => {
      const indexName = bucket.key as string;
      const numberOfDocs = bucket.number_of_metric_docs_for_index.value;
      const indexInfo = indicesInfo[indexName];
      const indexLifecycle = indicesLifecycleStatus[indexName];

      const size =
        allIndicesStats &&
        getEstimatedSizeForDocumentsInIndex({
          allIndicesStats,
          indexName,
          numberOfDocs,
        });

      return {
        indexName,
        numberOfDocs,
        primary: indexInfo
          ? indexInfo.settings?.index?.number_of_shards ?? 0
          : undefined,
        replica: indexInfo
          ? indexInfo.settings?.number_of_replicas ?? 0
          : undefined,
        size,
        dataStream: indexInfo?.data_stream,
        lifecyclePhase:
          indexLifecycle && 'phase' in indexLifecycle
            ? indexLifecycle.phase
            : undefined,
      };
    }) ?? []
  );
}
