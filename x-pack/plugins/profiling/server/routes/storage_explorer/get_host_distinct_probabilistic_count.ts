/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingESClient } from '../../utils/create_profiling_es_client';

export async function getHostAndDistinctProbabilisticCount({
  client,
  timeFrom,
  timeTo,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
}) {
  const response = await client.search('profiling_probabilistic_cardinality', {
    index: 'profiling-hosts',
    body: {
      query: {
        bool: {
          filter: {
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
        diffProbabilisticCount: {
          cardinality: {
            field: 'profiling.agent.config.probabilistic_threshold',
          },
        },
        hostCount: {
          cardinality: {
            field: 'host.id',
          },
        },
      },
    },
  });
  return {
    totalNumberOfDistinctProbabilisticValues:
      response.aggregations?.diffProbabilisticCount.value || 0,
    totalNumberOfHosts: response.aggregations?.hostCount.value || 0,
  };
}
