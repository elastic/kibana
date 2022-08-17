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
import { uniq } from 'lodash';
import { Setup } from '../../../lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TIER,
  TRANSACTION_SAMPLED,
  AGENT_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../../common/storage_explorer_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

export async function getDocCountPerProcessorEvent({
  setup,
  context,
  indexLifecyclePhase,
  probability,
  start,
  end,
  environment,
  kuery,
}: {
  setup: Setup;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  probability: number;
  start: number;
  end: number;
  environment: string;
  kuery: string;
}) {
  const { apmEventClient } = setup;

  const {
    indices: { transaction, span, metric, error },
  } = setup;
  const index = uniq([transaction, span, metric, error]).join();
  const esClient = (await context.core).elasticsearch.client;
  const indicesStats = (await esClient.asCurrentUser.indices.stats({ index }))
    .indices;

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
                  sample: {
                    top_hits: {
                      size: 1,
                      _source: [AGENT_NAME],
                      sort: {
                        '@timestamp': 'desc',
                      },
                    },
                  },
                  indices: {
                    terms: {
                      field: '_index',
                      size: 500,
                    },
                  },
                  environments: {
                    terms: {
                      field: SERVICE_ENVIRONMENT,
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
      const environments = bucket.environments.buckets.map(
        ({ key }) => key as string
      );

      const sampledTransactionDocs = bucket.processor_event.buckets.find(
        (x) => x.key === 'transaction'
      )?.sampled_transactions.buckets[0].doc_count;

      const estimatedSize = indicesStats
        ? bucket.indices.buckets.reduce((prev, curr) => {
            const indexName = curr.key as string;
            const indexDocCountForQuery = curr.doc_count;

            const indexStats = indicesStats[indexName];
            const indexSize = indexStats?.total?.store?.size_in_bytes;
            const indexTotalDocCount = indexStats?.total?.docs?.count;

            return (
              prev +
              (indexSize && indexTotalDocCount
                ? (indexDocCountForQuery / indexTotalDocCount) * indexSize
                : 0)
            );
          }, 0)
        : undefined;

      return {
        serviceName,
        environments,
        sampledTransactionDocs,
        size: estimatedSize,
        agentName: bucket.sample.hits.hits[0]?._source.agent.name as AgentName,
      };
    }
  );

  return serviceStats ?? [];
}

export type DocCountPerProcessorEventResponse = Awaited<
  ReturnType<typeof getDocCountPerProcessorEvent>
>;
