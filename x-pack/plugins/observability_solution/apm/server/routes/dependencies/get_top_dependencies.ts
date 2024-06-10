/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import {
  ConnectionStats,
  ConnectionStatsItemWithImpact,
  Node,
  NodeType,
} from '../../../common/connections';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';

interface Options {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  numBuckets: number;
  environment: string;
  offset?: string;
  kuery: string;
  randomSampler: RandomSampler;
}

interface TopDependenciesForTimeRange {
  stats: ConnectionStatsItemWithImpact[];
  // to inform when the query used random sampler aggregation
  sampled: boolean;
}

async function getTopDependenciesForTimeRange({
  apmEventClient,
  start,
  end,
  numBuckets,
  environment,
  offset,
  kuery,
  randomSampler,
}: Options): Promise<TopDependenciesForTimeRange> {
  const { statsItems, sampled } = await getConnectionStats({
    apmEventClient,
    start,
    end,
    numBuckets,
    filter: [...environmentQuery(environment), ...kqlQuery(kuery)],
    offset,
    collapseBy: 'downstream',
    randomSampler,
  });

  return {
    stats: getConnectionStatsItemsWithRelativeImpact(
      statsItems.filter((item) => item.location.type !== NodeType.service)
    ),
    sampled,
  };
}

export interface TopDependenciesResponse {
  dependencies: Array<{
    currentStats: ConnectionStats & {
      impact: number;
    };
    previousStats:
      | (ConnectionStats & {
          impact: number;
        })
      | null;
    location: Node;
  }>;
  // to inform when the query used random sampler aggregation
  sampled: boolean;
}

export async function getTopDependencies(options: Options): Promise<TopDependenciesResponse> {
  const { offset, ...otherOptions } = options;
  const [currentDependencies, previousDependencies] = await Promise.all([
    getTopDependenciesForTimeRange(otherOptions),
    offset ? getTopDependenciesForTimeRange({ ...otherOptions, offset }) : Promise.resolve([]),
  ]);

  return {
    dependencies: currentDependencies.stats.map((dependency) => {
      const { stats, ...rest } = dependency;
      const prev = (
        'stats' in previousDependencies ? previousDependencies.stats : previousDependencies
      ).find((item): boolean => item.location.id === dependency.location.id);

      return {
        ...rest,
        currentStats: stats,
        previousStats: prev?.stats ?? null,
      };
    }),
    sampled: currentDependencies.sampled,
  };
}
