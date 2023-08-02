/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { ProfilingESField } from '../../../common/elasticsearch';
import { computeBucketWidthFromTimeRangeAndBucketCount } from '../../../common/histogram';
import { StorageExplorerHostBreakdownSizeChart } from '../../../common/storage_explorer';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';
import { getEstimatedSizeForDocumentsInIndex } from './get_daily_data_generation.size';
import { getTotalIndicesStats } from './get_indices_stats';

async function getHostIdNameMap({
  client,
  timeFrom,
  timeTo,
  kuery,
  hostIds,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  kuery: string;
  hostIds: string[];
}) {
  const resp = await client.search('get_host_ids_names', {
    index: 'profiling-hosts',
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { [ProfilingESField.HostID]: hostIds } },
            {
              range: {
                [ProfilingESField.Timestamp]: {
                  gte: String(timeFrom),
                  lt: String(timeTo),
                  format: 'epoch_second',
                },
              },
            },
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        hostIds: {
          terms: {
            field: ProfilingESField.HostID,
          },
          aggs: {
            hostNames: {
              top_metrics: {
                metrics: { field: 'profiling.host.name' },
                sort: '_score',
              },
            },
          },
        },
      },
    },
  });

  return (
    resp.aggregations?.hostIds.buckets.reduce<Record<string, string>>((acc, curr) => {
      const hostId = curr.key as string;
      const hostName = curr.hostNames.top[0].metrics['profiling.host.name'] as string;
      return { ...acc, [hostId]: hostName };
    }, {}) || {}
  );
}

export async function getHostBreakdownSizeTimeseries({
  client,
  timeFrom,
  timeTo,
  kuery,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  kuery: string;
}): Promise<StorageExplorerHostBreakdownSizeChart[]> {
  const bucketWidth = computeBucketWidthFromTimeRangeAndBucketCount(timeFrom, timeTo, 50);

  const [{ indices: allIndicesStats }, response] = await Promise.all([
    getTotalIndicesStats({ client: client.getEsClient() }),
    client.search('profiling_events_metrics_size', {
      index: ['profiling-events-*', 'profiling-metrics'],
      body: {
        query: {
          bool: {
            filter: {
              ...kqlQuery(kuery),
              range: {
                [ProfilingESField.Timestamp]: {
                  gte: String(timeFrom),
                  lt: String(timeTo),
                  format: 'epoch_second',
                },
              },
            },
          },
        },
        aggs: {
          hosts: {
            terms: {
              field: ProfilingESField.HostID,
            },
            aggs: {
              storageTimeseries: {
                date_histogram: {
                  field: ProfilingESField.Timestamp,
                  fixed_interval: `${bucketWidth}s`,
                },
                aggs: {
                  indices: {
                    terms: {
                      field: '_index',
                      size: 500,
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

  const hostIds = response.aggregations?.hosts.buckets.map((bucket) => bucket.key as string);
  const hostIdsNamesMap = hostIds
    ? await getHostIdNameMap({ client, timeFrom, timeTo, kuery, hostIds })
    : {};

  return (
    response.aggregations?.hosts.buckets.map((bucket) => {
      const hostId = bucket.key as string;
      const hostName = hostIdsNamesMap[hostId];
      const timeseries = bucket.storageTimeseries.buckets.map((dateHistogramBucket) => {
        const estimatedSize = allIndicesStats
          ? dateHistogramBucket.indices.buckets.reduce((prev, curr) => {
              return (
                prev +
                getEstimatedSizeForDocumentsInIndex({
                  allIndicesStats,
                  indexName: curr.key as string,
                  numberOfDocs: curr.doc_count,
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
        hostId,
        hostName,
        timeseries,
      };
    }) || []
  );
}
