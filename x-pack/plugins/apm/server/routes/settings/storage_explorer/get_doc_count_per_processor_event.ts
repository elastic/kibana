/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../../lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TIER,
  TRANSACTION_SAMPLED,
} from '../../../../common/elasticsearch_fieldnames';
import {
  IndexLifecyclePhase,
  indexLifeCyclePhaseToDataTier,
} from '../../../../common/storage_explorer_types';

export async function getDocCountPerProcessorEvent({
  setup,
  indexLifecyclePhase,
  probability,
}: {
  setup: Setup;
  indexLifecyclePhase: IndexLifecyclePhase;
  probability: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_doc_count_per_processor_event',
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
        query: {
          bool: {
            filter: [
              ...termQuery(
                TIER,
                indexLifeCyclePhaseToDataTier[indexLifecyclePhase]
              ),
            ] as QueryDslQueryContainer[],
          },
        },
        aggs: {
          sample: {
            random_sampler: {
              probability,
            },
            aggs: {
              services: {
                terms: {
                  field: SERVICE_NAME,
                  size: 500,
                },
                aggs: {
                  environments: {
                    terms: {
                      field: SERVICE_ENVIRONMENT,
                      size: 500,
                    },
                  },
                  processor_event: {
                    terms: {
                      field: PROCESSOR_EVENT,
                      size: 10,
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
    }
  );

  const serviceStats = response.aggregations?.sample.services.buckets.map(
    (bucket) => {
      const serviceName = bucket.key as string;
      const totalServiceDocs = bucket.doc_count;
      const environments = bucket.environments.buckets.map(
        ({ key }) => key as string
      );

      const sampledTransactionDocs = bucket.processor_event.buckets.find(
        (x) => x.key === 'transaction'
      )?.sampled_transactions.buckets[0].doc_count;

      const docsPerProcessorEvent = bucket.processor_event.buckets.reduce(
        (
          acc: Record<Exclude<ProcessorEvent, ProcessorEvent.profile>, number>,
          { key, doc_count: docCount }
        ) => {
          acc[key as Exclude<ProcessorEvent, ProcessorEvent.profile>] =
            docCount;
          return acc;
        },
        {
          [ProcessorEvent.transaction]: 0,
          [ProcessorEvent.span]: 0,
          [ProcessorEvent.metric]: 0,
          [ProcessorEvent.error]: 0,
        }
      );

      return {
        serviceName,
        environments,
        totalServiceDocs,
        sampledTransactionDocs,
        transactionDocs: docsPerProcessorEvent.transaction,
        spanDocs: docsPerProcessorEvent.span,
        metricDocs: docsPerProcessorEvent.metric,
        errorDocs: docsPerProcessorEvent.error,
      };
    }
  );

  return serviceStats ?? [];
}

export type DocCountPerProcessorEventResponse = Awaited<
  ReturnType<typeof getDocCountPerProcessorEvent>
>;
