/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectionStatsItemWithImpact } from '../../../common/connections';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

interface Options {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceName: string;
  numBuckets: number;
  environment: string;
  offset?: string;
}

async function getServiceDependenciesForTimeRange({
  apmEventClient,
  start,
  end,
  serviceName,
  numBuckets,
  environment,
  offset,
}: Options) {
  const statsItems = await getConnectionStats({
    apmEventClient,
    start,
    end,
    numBuckets,
    filter: [
      { term: { [SERVICE_NAME]: serviceName } },
      ...environmentQuery(environment),
    ],
    offset,
    collapseBy: 'downstream',
  });

  return getConnectionStatsItemsWithRelativeImpact(statsItems);
}

export type ServiceDependenciesResponse = Array<
  Omit<ConnectionStatsItemWithImpact, 'stats'> & {
    currentStats: ConnectionStatsItemWithImpact['stats'];
    previousStats: ConnectionStatsItemWithImpact['stats'] | null;
  }
>;

export async function getServiceDependencies(
  opts: Options
): Promise<ServiceDependenciesResponse> {
  const { offset, ...sharedOptions } = opts;

  const [currentPeriod, previousPeriod] = await Promise.all([
    getServiceDependenciesForTimeRange(sharedOptions),
    ...(offset
      ? [getServiceDependenciesForTimeRange({ ...sharedOptions, offset })]
      : [[]]),
  ]);

  return currentPeriod.map((item) => {
    const { stats, ...rest } = item;
    const previousPeriodItem = previousPeriod.find(
      (prevItem): boolean => item.location.id === prevItem.location.id
    );

    return {
      ...rest,
      currentStats: stats,
      previousStats: previousPeriodItem?.stats || null,
    };
  });
}
