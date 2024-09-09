/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { ConnectionStats, Node } from '../../../common/connections';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';

interface Options {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  dependencyName: string;
  numBuckets: number;
  kuery: string;
  environment: string;
  offset?: string;
  randomSampler: RandomSampler;
}

async function getUpstreamServicesForDependencyForTimeRange({
  apmEventClient,
  start,
  end,
  dependencyName,
  numBuckets,
  kuery,
  environment,
  offset,
  randomSampler,
}: Options) {
  const { statsItems } = await getConnectionStats({
    apmEventClient,
    start,
    end,
    filter: [
      { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName } },
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ],
    collapseBy: 'upstream',
    numBuckets,
    offset,
    randomSampler,
  });

  return getConnectionStatsItemsWithRelativeImpact(statsItems);
}

export interface UpstreamServicesForDependencyResponse {
  services: Array<{
    location: Node;
    currentStats: ConnectionStats & { impact: number };
    previousStats: (ConnectionStats & { impact: number }) | null;
  }>;
}

export async function getUpstreamServicesForDependency(
  options: Options
): Promise<UpstreamServicesForDependencyResponse> {
  const { offset, ...otherOptions } = options;

  const [currentServices, previousServices] = await Promise.all([
    getUpstreamServicesForDependencyForTimeRange(otherOptions),
    offset
      ? getUpstreamServicesForDependencyForTimeRange({
          ...otherOptions,
          offset,
        })
      : Promise.resolve([]),
  ]);

  return {
    services: currentServices.map((service) => {
      const { stats, ...rest } = service;
      const prev = previousServices.find((item) => item.location.id === service.location.id);
      return {
        ...rest,
        currentStats: stats,
        previousStats: prev?.stats ?? null,
      };
    }),
  };
}
