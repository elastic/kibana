/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { map } from 'lodash';

export async function getMetadataFromAggregations({
  dataStreamName,
  esClient,
}: {
  dataStreamName: string;
  esClient: ElasticsearchClient;
}) {
  // Query backing indices to extract data stream dataset, namespace, and type values
  const { aggregations: dataStreamAggs } = await esClient.search({
    index: dataStreamName,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'data_stream.namespace',
              },
            },
            {
              exists: {
                field: 'data_stream.dataset',
              },
            },
          ],
        },
      },
      aggs: {
        maxIngestedTimestamp: {
          max: {
            field: 'event.ingested',
          },
        },
        dataset: {
          terms: {
            field: 'data_stream.dataset',
            size: 1,
          },
        },
        namespace: {
          terms: {
            field: 'data_stream.namespace',
            size: 1,
          },
        },
        type: {
          terms: {
            field: 'data_stream.type',
            size: 1,
          },
        },
        serviceName: {
          terms: {
            field: 'service.name',
            size: 2,
          },
        },
        environment: {
          terms: {
            field: 'service.environment',
            size: 2,
            missing: 'ENVIRONMENT_NOT_DEFINED',
          },
        },
      },
    },
  });

  const { maxIngestedTimestamp } = dataStreamAggs as Record<
    string,
    estypes.AggregationsRateAggregate
  >;
  const { dataset, namespace, type, serviceName, environment } = dataStreamAggs as Record<
    string,
    estypes.AggregationsMultiBucketAggregateBase<{ key?: string; value?: number }>
  >;

  const maxIngested = maxIngestedTimestamp?.value;

  return {
    maxIngested,
    dataset: (dataset.buckets as Array<{ key?: string; value?: number }>)[0]?.key || '',
    namespace: (namespace.buckets as Array<{ key?: string; value?: number }>)[0]?.key || '',
    type: (type.buckets as Array<{ key?: string; value?: number }>)[0]?.key || '',
    serviceNames: map(serviceName.buckets, 'key') as string[],
    environments: map(environment.buckets, 'key') as string[],
  };
}
