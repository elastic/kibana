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
        hostsAndProjectIds: {
          multi_terms: {
            terms: [{ field: 'host.id' }, { field: 'profiling.project.id' }],
          },
          aggs: {
            activeProbabilisticValue: {
              top_metrics: {
                metrics: {
                  field: 'profiling.agent.config.probabilistic_threshold',
                },
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
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

  const activeProbabilisticValuesPerProjectId: Record<string, Set<string>> = {};
  response.aggregations?.hostsAndProjectIds.buckets.forEach((bucket) => {
    const projectId = bucket.key[1] as string;
    const activeProbabilisticValue = bucket.activeProbabilisticValue.top[0]?.metrics?.[
      'profiling.agent.config.probabilistic_threshold'
    ] as string | undefined;
    if (activeProbabilisticValue) {
      const currentMap = activeProbabilisticValuesPerProjectId[projectId];
      if (currentMap) {
        currentMap.add(activeProbabilisticValue);
      } else {
        const activeProbabilisticSet = new Set<string>();
        activeProbabilisticSet.add(activeProbabilisticValue);
        activeProbabilisticValuesPerProjectId[projectId] = activeProbabilisticSet;
      }
    }
  });

  let totalNumberOfDistinctProbabilisticValues = 0;
  Object.keys(activeProbabilisticValuesPerProjectId).forEach((projectId) => {
    const activeProbabilisticValues = activeProbabilisticValuesPerProjectId[projectId];
    if (activeProbabilisticValues.size > 1) {
      totalNumberOfDistinctProbabilisticValues += activeProbabilisticValues.size;
    }
  });

  return {
    totalNumberOfDistinctProbabilisticValues,
    totalNumberOfHosts: response.aggregations?.hostCount.value || 0,
  };
}
