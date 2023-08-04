/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery } from '@kbn/observability-plugin/server';
import { ProfilingESField } from '../../../common/elasticsearch';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';

interface HostDetails {
  hostName: string;
  probabilisticValues: number[];
}

export async function getProfilingHostsDetailsById({
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
            probabilisticValues: {
              terms: {
                field: 'profiling.agent.config.probabilistic_threshold',
                size: 5,
                order: {
                  // Order by @timestamp to receive the active value first
                  latestDate: 'desc',
                },
              },
              aggs: {
                latestDate: {
                  max: {
                    field: ProfilingESField.Timestamp,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    resp.aggregations?.hostIds.buckets.reduce<Record<string, HostDetails>>((acc, curr) => {
      const hostId = curr.key as string;
      const hostName = curr.hostNames.top[0].metrics['profiling.host.name'] as string;
      const probabilisticValues = curr.probabilisticValues.buckets.map(
        (probValues) => probValues.key as number
      );
      return { ...acc, [hostId]: { hostName, probabilisticValues } };
    }, {}) || {}
  );
}
