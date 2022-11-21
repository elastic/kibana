/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { serviceGroupQuery } from '../../../lib/service_group_query';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServicesFromErrorAndMetricDocuments({
  environment,
  apmEventClient,
  maxNumServices,
  kuery,
  start,
  end,
  serviceGroup,
  randomSampler,
}: {
  apmEventClient: APMEventClient;
  environment: string;
  maxNumServices: number;
  kuery: string;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
}) {
  const response = await apmEventClient.search(
    'get_services_from_error_and_metric_documents',
    {
      apm: {
        events: [ProcessorEvent.metric, ProcessorEvent.error],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...serviceGroupQuery(serviceGroup),
            ],
          },
        },
        aggs: {
          sample: {
            random_sampler: randomSampler,
            aggs: {
              services: {
                terms: {
                  field: SERVICE_NAME,
                  size: maxNumServices,
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
        },
      },
    }
  );

  return (
    response.aggregations?.sample.services.buckets.map((bucket) => {
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
