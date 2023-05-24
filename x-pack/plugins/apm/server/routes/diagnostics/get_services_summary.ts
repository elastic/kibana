/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { PROCESSOR_EVENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';

export async function getServicesSummaryPerProcessorEvent({
  apmEventClient,
  start,
  end,
  randomSampler,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  const response = await apmEventClient.search(
    'get_storage_details_per_processor_event',
    {
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
            filter: [...rangeQuery(start, end)],
          },
        },
        aggs: {
          sample: {
            random_sampler: randomSampler,
            aggs: {
              services: {
                terms: {
                  field: SERVICE_NAME,
                  size: 1000,
                },
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
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  );

  const services =
    response.aggregations?.sample.services.buckets?.map((service) => ({
      name: service.key as string,
      transactions: service.processor_event.buckets?.find(
        (event) => event.key === ProcessorEvent.transaction
      )?.number_of_metric_docs_for_processor_event.value,
      spans: service.processor_event.buckets?.find(
        (event) => event.key === ProcessorEvent.span
      )?.number_of_metric_docs_for_processor_event.value,
      metrics: service.processor_event.buckets?.find(
        (event) => event.key === ProcessorEvent.metric
      )?.number_of_metric_docs_for_processor_event.value,
      errors: service.processor_event.buckets?.find(
        (event) => event.key === ProcessorEvent.error
      )?.number_of_metric_docs_for_processor_event.value,
    })) ?? [];

  return { services };
}
