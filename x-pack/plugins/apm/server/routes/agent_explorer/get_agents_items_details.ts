/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common/processor_event';
import {
  kqlQuery,
  rangeQuery,
  termQuery
} from '@kbn/observability-plugin/server/utils/queries';
import {
  AGENT_NAME,
  AGENT_VERSION,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { RandomSampler } from '../../lib/helpers/get_random_sampler';

interface AggregationParams {
  environment: string;
  serviceName?: string;
  agentLanguage?: string;
  kuery: string;
  apmEventClient: APMEventClient;
  maxNumServices: number;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}

export async function getAgentsDetails({
  environment,
  agentLanguage,
  serviceName,
  kuery,
  apmEventClient,
  maxNumServices,
  start,
  end,
  randomSampler,
}: AggregationParams) {
  const response = await apmEventClient.search('get_agent_details', {
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
            {
              exists: {
                field: SERVICE_NODE_NAME,
              },
            },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...(serviceName ? termQuery(SERVICE_NAME, serviceName) : []),
            ...(agentLanguage
              ? termQuery(SERVICE_LANGUAGE_NAME, agentLanguage)
              : []),
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
                serviceNodes: {
                  terms: {
                    field: SERVICE_NODE_NAME,
                    size: maxNumServices,
                  },
                  aggs: {
                    environments: {
                      terms: {
                        field: SERVICE_ENVIRONMENT,
                      },
                    },
                    sample: {
                      top_metrics: {
                        metrics: [
                          { field: AGENT_NAME } as const,
                          { field: AGENT_VERSION } as const,
                          { field: SERVICE_LANGUAGE_NAME } as const,
                        ],
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
      },
    },
  });

  return (
    response.aggregations?.sample.services.buckets.map((bucket) => {
      const agent = bucket.serviceNodes.buckets.reduce(
        (acc, serviceNode) => ({
          environments: Array.from(
            new Set([
              ...acc.environments,
              ...serviceNode.environments.buckets.map(
                (env) => env.key as string
              ),
            ])
          ),
          agentName: serviceNode.sample.top[0].metrics[AGENT_NAME] as AgentName,
          agentVersion: Array.from(
            new Set([
              ...acc.agentVersion,
              serviceNode.sample.top[0].metrics[AGENT_VERSION] as string,
            ])
          ),
        }),
        { environments: [], agentVersion: [] } as {
          environments: string[];
          agentName?: AgentName;
          agentVersion: string[];
        }
      );

      return {
        serviceName: bucket.key as string,
        environments: agent.environments,
        agentName: agent.agentName,
        agentVersion: agent.agentVersion,
      };
    }) ?? []
  );
}
