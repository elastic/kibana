/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  termQuery,
  kqlQuery,
  rangeQuery,
} from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { Setup } from '../../lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TIER,
  INDEX,
} from '../../../common/elasticsearch_fieldnames';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { ApmPluginRequestHandlerContext } from '../typings';
import {
  getTotalIndicesStats,
  getEstimatedSizeForDocumentsInIndex,
} from './indices_stats_helpers';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';

export async function getStorageDetailsPerProcessorEvent({
  setup,
  context,
  indexLifecyclePhase,
  randomSampler,
  start,
  end,
  environment,
  kuery,
  serviceName,
}: {
  setup: Setup;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  serviceName: string;
}) {
  const { apmEventClient } = setup;

  const [{ indices: allIndicesStats }, response] = await Promise.all([
    getTotalIndicesStats({ setup, context }),
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
            ] as QueryDslQueryContainer[],
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
