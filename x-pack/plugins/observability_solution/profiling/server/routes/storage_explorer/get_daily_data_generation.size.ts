/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';

export function getEstimatedSizeForDocumentsInIndex({
  allIndicesStats,
  indexName,
  numberOfDocs,
}: {
  allIndicesStats: Record<string, IndicesStatsIndicesStats>;
  indexName: string;
  numberOfDocs: number;
}) {
  const indexStats = allIndicesStats[indexName];
  const indexTotalSize = indexStats?.total?.store?.size_in_bytes ?? 0;
  const indexTotalDocCount = indexStats?.total?.docs?.count;

  const estimatedSize = indexTotalDocCount
    ? (numberOfDocs / indexTotalDocCount) * indexTotalSize
    : 0;

  return estimatedSize;
}

export async function getDailyDataGenerationSize({
  client,
  timeFrom,
  timeTo,
  allIndicesStats,
  kuery,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  allIndicesStats?: Record<string, IndicesStatsIndicesStats>;
  kuery: string;
}) {
  const response = await client.search('profiling_indices_size', {
    index: [
      'profiling-events-*',
      'profiling-stacktraces',
      'profiling-hosts',
      'profiling-metrics',
    ].join(),
    body: {
      query: {
        bool: {
          filter: {
            ...kqlQuery(kuery),
            range: {
              '@timestamp': {
                gte: String(timeFrom),
                lt: String(timeTo),
                format: 'epoch_second',
              },
            },
          },
        },
      },
      aggs: {
        indices: {
          terms: {
            field: '_index',
          },
          aggs: {
            number_of_documents: {
              value_count: {
                field: '_index',
              },
            },
          },
        },
      },
    },
  });

  const estimatedIncrementalSize = allIndicesStats
    ? response.aggregations?.indices.buckets.reduce((prev, curr) => {
        return (
          prev +
          getEstimatedSizeForDocumentsInIndex({
            allIndicesStats,
            indexName: curr.key as string,
            numberOfDocs: curr.number_of_documents.value,
          })
        );
      }, 0) ?? 0
    : 0;

  const durationAsDays = (timeTo - timeFrom) / 60 / 60 / 24;

  return { dailyDataGenerationBytes: estimatedIncrementalSize / durationAsDays };
}
