/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import * as t from 'io-ts';
import { termQuery } from '@kbn/observability-plugin/server';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getDestinationMap } from '../../../lib/connections/get_connection_stats/get_destination_map';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { NodeType } from '../../../../common/connections';

export const downstreamDependenciesRouteRt = t.intersection([
  t.type({
    serviceName: t.string,
    start: t.string,
    end: t.string,
  }),
  t.partial({
    serviceEnvironment: t.string,
  }),
]);

export interface APMDownstreamDependency {
  'service.name'?: string | undefined;
  'span.destination.service.resource': string;
  'span.type'?: string | undefined;
  'span.subtype'?: string | undefined;
}

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

  const { nodesBydependencyName: map } = await getDestinationMap({
    start,
    end,
    apmEventClient,
    filter: [
      ...termQuery(SERVICE_NAME, args.serviceName),
      ...environmentQuery(args.serviceEnvironment ?? ENVIRONMENT_ALL.value),
    ],
    randomSampler,
  });

  const items: Array<{
    'service.name'?: string;
    'span.destination.service.resource': string;
    'span.type'?: string;
    'span.subtype'?: string;
  }> = [];

  for (const [_, node] of map) {
    if (node.type === NodeType.service) {
      items.push({
        'service.name': node.serviceName,
        // this should be set, as it's a downstream dependency, and there should be a connection
        'span.destination.service.resource': node.dependencyName!,
      });
    } else {
      items.push({
        'span.destination.service.resource': node.dependencyName,
        'span.type': node.spanType,
        'span.subtype': node.spanSubtype,
      });
    }
  }

  return items;
}
