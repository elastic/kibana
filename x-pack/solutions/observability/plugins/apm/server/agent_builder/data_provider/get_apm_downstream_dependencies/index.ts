/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { round } from 'lodash';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { getConnectionStats } from '../../../lib/connections/get_connection_stats';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { NodeType } from '../../../../common/connections';

export interface APMDownstreamDependency {
  'service.name'?: string;
  'span.destination.service.resource': string;
  'span.type'?: string;
  'span.subtype'?: string;
  errorRate?: number;
  latencyMs?: number;
  throughputPerMin?: number;
}

export async function getApmDownstreamDependencies({
  apmEventClient,
  randomSampler,
  start,
  end,
  filter,
}: {
  apmEventClient: APMEventClient;
  randomSampler: RandomSampler;
  start: number;
  end: number;
  filter: QueryDslQueryContainer[];
}): Promise<APMDownstreamDependency[]> {
  const { statsItems } = await getConnectionStats({
    start,
    end,
    apmEventClient,
    filter,
    collapseBy: 'downstream',
    numBuckets: 1, // not used when withTimeseries: false, but required param
    randomSampler,
    withTimeseries: false,
  });
  return statsItems.map((item) => {
    const { location } = item;

    // @ts-expect-error - dependencyName exists when collapsing downstream
    const dependencyName = location.dependencyName!;

    const { errorRate, latency, throughput } = item.stats;

    const metrics = {
      errorRate: errorRate?.value ?? undefined,
      latencyMs: latency?.value != null ? latency.value / 1000 : undefined,
      throughputPerMin: throughput?.value != null ? round(throughput.value, 3) : undefined,
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
