/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery } from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import { ProfilingESField } from '@kbn/profiling-utils';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';

interface HostDetails {
  hostId: string;
  hostName: string;
  probabilisticValuesPerProject: Record<
    string,
    { projectId: string; probabilisticValues: Array<{ value: number; date: number | null }> }
  >;
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
}): Promise<Record<string, HostDetails>> {
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
            projectIds: {
              terms: {
                field: 'profiling.project.id',
              },
              aggs: {
                probabilisticValues: {
                  terms: {
                    field: 'profiling.agent.config.probabilistic_threshold',
                    size: 5,
                    order: { agentFirstStartDate: 'desc' },
                  },
                  aggs: {
                    agentFirstStartDate: {
                      min: {
                        field: 'profiling.agent.start_time',
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
  });

  const hostsDetails =
    resp.aggregations?.hostIds.buckets.map((bucket): HostDetails => {
      const hostId = bucket.key as string;
      const hostName = bucket.hostNames.top[0].metrics['profiling.host.name'] as string;

      const probabilisticValuesPerProject = bucket.projectIds.buckets.map((projectIdBucket) => {
        const projectId = projectIdBucket.key as string;
        const probabilisticValues = projectIdBucket.probabilisticValues.buckets.map(
          (probValuesBucket) => {
            return {
              value: probValuesBucket.key as number,
              date: probValuesBucket.agentFirstStartDate.value,
            };
          }
        );
        return { projectId, probabilisticValues };
      });

      return {
        hostId,
        hostName,
        probabilisticValuesPerProject: keyBy(probabilisticValuesPerProject, 'projectId'),
      };
    }) || [];

  return keyBy(hostsDetails, 'hostId');
}
