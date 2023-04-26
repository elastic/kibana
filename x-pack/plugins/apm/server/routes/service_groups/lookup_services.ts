/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export type LookupServicesResponse = Array<{
  serviceName: string;
  environments: string[];
  agentName: AgentName;
}>;

export async function lookupServices({
  apmEventClient,
  kuery,
  start,
  end,
  maxNumberOfServices,
}: {
  apmEventClient: APMEventClient;
  kuery: string;
  start: number;
  end: number;
  maxNumberOfServices: number;
}): Promise<LookupServicesResponse> {
  const response = await apmEventClient.search('lookup_services', {
    apm: {
      events: [
        ProcessorEvent.metric,
        ProcessorEvent.transaction,
        ProcessorEvent.span,
        ProcessorEvent.error,
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...kqlQuery(kuery)],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: maxNumberOfServices,
          },
          aggs: {
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
              },
            },
            latest: {
              top_metrics: {
                metrics: [{ field: AGENT_NAME } as const],
                sort: { '@timestamp': 'desc' },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      return {
        serviceName: bucket.key as string,
        environments: bucket.environments.buckets.map(
          (envBucket) => envBucket.key as string
        ),
        agentName: bucket.latest.top[0].metrics[AGENT_NAME] as AgentName,
      };
    }) ?? []
  );
}
