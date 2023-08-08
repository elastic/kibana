/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '../../../common/storage_explorer';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';

export async function getHostAndDistinctProbabilisticCount({
  client,
  timeFrom,
  timeTo,
  kuery,
  indexLifecyclePhase,
}: {
  client: ProfilingESClient;
  timeFrom: number;
  timeTo: number;
  kuery: string;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}) {
  const response = await client.search('profiling_probabilistic_cardinality', {
    index: 'profiling-hosts',
    body: {
      query: {
        bool: {
          filter: [
            ...kqlQuery(kuery),
            {
              range: {
                '@timestamp': {
                  gte: String(timeFrom),
                  lt: String(timeTo),
                  format: 'epoch_second',
                },
              },
            },
            ...(indexLifecyclePhase !== IndexLifecyclePhaseSelectOption.All
              ? termQuery('_tier', indexLifeCyclePhaseToDataTier[indexLifecyclePhase])
              : []),
          ],
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
