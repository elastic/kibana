/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { LookupServicesResponse } from '@kbn/apm-api-shared';
import type { ApmDataSourceWithSummary } from '@kbn/apm-types';
import { getPreferredBucketSizeAndDataSource } from '@kbn/apm-data-access-plugin/common';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function lookupServices({
  apmEventClient,
  kuery,
  start,
  end,
  maxNumberOfServices,
  sources,
}: {
  apmEventClient: APMEventClient;
  kuery: string;
  start: number;
  end: number;
  maxNumberOfServices: number;
  sources: ApmDataSourceWithSummary[];
}): Promise<LookupServicesResponse> {
  const { source } = getPreferredBucketSizeAndDataSource({
    sources,
    bucketSizeInSeconds: (end - start) / 1000,
  });
  const { documentType, rollupInterval } = source;
  const response = await apmEventClient.search('lookup_services', {
    apm: {
      sources: [{ documentType, rollupInterval }],
    },
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
  });

  return (
    response.aggregations?.services.buckets.map((bucket) => {
      return {
        serviceName: bucket.key as string,
        environments: bucket.environments.buckets.map((envBucket) => envBucket.key as string),
        agentName: bucket.latest.top[0].metrics[AGENT_NAME] as AgentName,
      };
    }) ?? []
  );
}
