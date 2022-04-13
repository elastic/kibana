/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../../lib/helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';

type ProcessorEventType =
  | ProcessorEvent.transaction
  | ProcessorEvent.span
  | ProcessorEvent.error
  | ProcessorEvent.metric;

export async function getServiceStorageStats({
  searchAggregatedTransactions,
  setup,
  start,
  end,
  environment,
}: {
  searchAggregatedTransactions: boolean;
  setup: Setup;
  start: number;
  end: number;
  environment: string;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_service_storage_stats', {
    apm: {
      events: [
        // getProcessorEventForTransactions(searchAggregatedTransactions),
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
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
          ] as QueryDslQueryContainer[],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 10,
          },
          aggs: {
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
                size: 10,
              },
            },
            processor_event: {
              terms: {
                field: PROCESSOR_EVENT,
                size: 10,
              },
            },
          },
        },
      },
    },
  });

  const serviceStats = response.aggregations?.services.buckets.map((bucket) => {
    const service = bucket.key as string;
    const serviceDocs = bucket.doc_count;
    const environments = bucket.environments.buckets.map(
      ({ key }) => key as string
    );
    const docsCount = bucket.processor_event.buckets.reduce(
      (
        acc: Record<ProcessorEventType, number>,
        { key, doc_count: docCount }
      ) => {
        const bucketKey = key as ProcessorEventType;
        acc[bucketKey] = docCount;
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
      service,
      serviceDocs,
      environments,
      ...docsCount,
      calls: 0,
    };
  });

  return serviceStats ?? [];
}
