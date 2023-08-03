/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { ProfilingESField } from '../../../common/elasticsearch';
import { StorageExplorerHostDetails } from '../../../common/storage_explorer';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';
import { getEstimatedSizeForDocumentsInIndex } from './get_daily_data_generation.size';
import { getTotalIndicesStats } from './get_indices_stats';
import { getProfilingHostsDetailsById } from './get_profiling_hosts_details_by_id';

const perIndexInitialSize = { events: 0, metrics: 0 };

export async function getHostDetails({
  client,
  timeFrom,
  timeTo,
  kuery,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  kuery: string;
}): Promise<StorageExplorerHostDetails[]> {
  const [{ indices: allIndicesStats }, response] = await Promise.all([
    getTotalIndicesStats({ client: client.getEsClient() }),
    client.search('profiling_events_metrics_details', {
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
              projectIds: {
                terms: {
                  field: 'profiling.project.id',
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
  const hostsDetailsMap = hostIds
    ? await getProfilingHostsDetailsById({ client, timeFrom, timeTo, kuery, hostIds })
    : {};

  return (
    response.aggregations?.hosts.buckets.flatMap((bucket) => {
      const hostId = bucket.key as string;
      const { hostName, probabilisticValues } = hostsDetailsMap[hostId];

      return bucket.projectIds.buckets.map((projectBucket): StorageExplorerHostDetails => {
        const totalPerIndex = allIndicesStats
          ? projectBucket.indices.buckets.reduce((acc, indexBucket) => {
              const indexName = indexBucket.key as string;
              const estimatedSize = getEstimatedSizeForDocumentsInIndex({
                allIndicesStats,
                indexName,
                numberOfDocs: indexBucket.doc_count,
              });
              return {
                ...acc,
                ...(indexName.indexOf('metrics') > 0
                  ? { metrics: acc.metrics + estimatedSize }
                  : { events: acc.events + estimatedSize }),
              };
            }, perIndexInitialSize)
          : perIndexInitialSize;

        return {
          hostId,
          hostName,
          probabilisticValues,
          projectId: projectBucket.key as string,
          totalEventsSize: totalPerIndex.events,
          totalMetricsSize: totalPerIndex.metrics,
          totalSize: totalPerIndex.events + totalPerIndex.metrics,
        };
      });
    }) || []
  );
}
