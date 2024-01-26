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

interface Options {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  numBuckets: number;
  environment: string;
  offset?: string;
  kuery: string;
}

async function getTopDependenciesForTimeRange({
  apmEventClient,
  start,
  end,
  numBuckets,
  environment,
  offset,
  kuery,
}: Options): Promise<ConnectionStatsItemWithImpact[]> {
  const statsItems = await getConnectionStats({
    apmEventClient,
    start,
    end,
    numBuckets,
    filter: [...environmentQuery(environment), ...kqlQuery(kuery)],
    offset,
    collapseBy: 'downstream',
  });

  return getConnectionStatsItemsWithRelativeImpact(
    statsItems.filter((item) => item.location.type !== NodeType.service)
  );
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
}

export async function getTopDependencies(
  options: Options
): Promise<TopDependenciesResponse> {
  const { offset, ...otherOptions } = options;
  const [currentDependencies, previousDependencies] = await Promise.all([
    getTopDependenciesForTimeRange(otherOptions),
    offset
      ? getTopDependenciesForTimeRange({ ...otherOptions, offset })
      : Promise.resolve([]),
  ]);

  return {
    dependencies: currentDependencies.map((dependency) => {
      const { stats, ...rest } = dependency;
      const prev = previousDependencies.find(
        (item): boolean => item.location.id === dependency.location.id
      );
      return {
        ...rest,
        currentStats: stats,
        previousStats: prev?.stats ?? null,
      };
    }),
  };
}
