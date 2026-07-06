/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import type * as t from 'io-ts';
import { termQuery } from '@kbn/observability-plugin/server';
import type { downstreamDependenciesRouteRt } from '@kbn/apm-types';
import { type APMDownstreamDependency } from '@kbn/apm-types';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getConnectionStats } from '../../../lib/connections/get_connection_stats';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { NodeType } from '../../../../common/connections';

export { downstreamDependenciesRouteRt, type APMDownstreamDependency } from '@kbn/apm-types';

export async function getApmDownstreamDependencies({
  arguments: args,
  apmEventClient,
  randomSampler,
}: {
  arguments: t.TypeOf<typeof downstreamDependenciesRouteRt>;
  apmEventClient: APMEventClient;
  randomSampler: RandomSampler;
}): Promise<APMDownstreamDependency[]> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const { statsItems } = await getConnectionStats({
    start,
    end,
    apmEventClient,
    filter: [
      ...termQuery(SERVICE_NAME, args.serviceName),
      ...environmentQuery(args.serviceEnvironment ?? ENVIRONMENT_ALL.value),
    ],
    collapseBy: 'downstream',
    numBuckets: 1, // not used when withTimeseries: false, but required param
    randomSampler,
    withTimeseries: false,
  });
  return statsItems.map((item) => {
    const { location, stats } = item;

    // @ts-expect-error - dependencyName exists when collapsing downstream
    const dependencyName = location.dependencyName!;

    const rawThroughput = stats.throughput?.value;
    const metrics = {
      errorRate: stats.errorRate?.value ?? undefined,
      latencyMs: stats.latency?.value ?? undefined,
      // Round to 3 decimal places for cleaner LLM output
      throughputPerMin: rawThroughput != null ? Math.round(rawThroughput * 1000) / 1000 : undefined,
    };

    if (location.type === NodeType.service) {
      return {
        'service.name': location.serviceName,
        'span.destination.service.resource': dependencyName,
        ...metrics,
      };
    }

    return {
      'span.destination.service.resource': dependencyName,
      'span.type': location.spanType,
      'span.subtype': location.spanSubtype,
      ...metrics,
    };
  });
}
