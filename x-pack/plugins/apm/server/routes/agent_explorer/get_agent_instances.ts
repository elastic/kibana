/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  AGENT_NAME,
  AGENT_VERSION,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';
import { MAX_NUMBER_OF_SERVICES } from '../services/get_services/get_services_items';

export async function getAgentInstances({
  environment,
  serviceName,
  kuery,
  apmEventClient,
  start,
  end,
  randomSampler,
}: {
  environment: string;
  serviceName?: string;
  kuery: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  const response = await apmEventClient.search('get_agent_instances', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: AGENT_NAME,
              },
            },
            {
              exists: {
                field: AGENT_VERSION,
              },
            },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...(serviceName ? termQuery(SERVICE_NAME, serviceName) : []),
          ],
        },
      },
      aggs: {
        sample: {
          random_sampler: randomSampler,
          aggs: {
            serviceNodes: {
              terms: {
                field: SERVICE_NODE_NAME,
                size: MAX_NUMBER_OF_SERVICES,
              },
              aggs: {
                environments: {
                  terms: {
                    field: SERVICE_ENVIRONMENT,
                  },
                },
                sample: {
                  top_metrics: {
                    metrics: [{ field: AGENT_VERSION } as const],
                    sort: {
                      '@timestamp': 'desc' as const,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    response.aggregations?.sample.serviceNodes.buckets.map((agentInstance) => ({
      serviceNode: agentInstance.key as string,
      environments: agentInstance.environments.buckets.map(
        (environmentBucket) => environmentBucket.key as string
      ),
      agentVersion: agentInstance.sample.top[0].metrics[
        AGENT_VERSION
      ] as string,
      lastReport: agentInstance.sample.top[0].sort[0] as string,
    })) ?? []
  );
}
