/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/typesWithBodyKey";
import { AGENT_NAME, AGENT_VERSION, SERVICE_ENVIRONMENT, SERVICE_LANGUAGE_NAME, SERVICE_NAME, SERVICE_NODE_NAME } from "@kbn/apm-plugin/common/elasticsearch_fieldnames";
import { environmentQuery } from "@kbn/apm-plugin/common/utils/environment_query";
import { AgentName } from "@kbn/apm-plugin/typings/es_schemas/ui/fields/agent";
import { ProcessorEvent } from "@kbn/observability-plugin/common/processor_event";
import { kqlQuery, rangeQuery } from "@kbn/observability-plugin/server/utils/queries";
import { RandomSampler } from "../../lib/helpers/get_random_sampler";
import { AgenItemsSetup } from "./get_agents_items";

export function serviceNameQuery(
  serviceName?: string
): QueryDslQueryContainer[] {
  if (!serviceName) {
    return [];
  }

  return [{ term: { [SERVICE_NAME]: serviceName } }];
}

export function agentNameQuery(
  agentName?: string
): QueryDslQueryContainer[] {
  if (!agentName) {
    return [];
  }

  return [{ term: { [SERVICE_LANGUAGE_NAME]: agentName } }];
}

interface AggregationParams {
  environment: string;
  serviceName?: string;
  agentName?: string;
  kuery: string;
  setup: AgenItemsSetup;
  maxNumServices: number;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}

export async function getAgentsDetails({
  environment,
  agentName,
  serviceName,
  kuery,
  setup,
  maxNumServices,
  start,
  end,
  randomSampler,
}: AggregationParams) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_agent_details',
    {
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
                }
              },
              {
                exists: {
                  field: AGENT_VERSION,
                }
              },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
              ...serviceNameQuery(serviceName),
              ...agentNameQuery(agentName),
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
                  instances: {
                    cardinality: {
                      field: SERVICE_NODE_NAME,
                    }
                  },
                  agents: {
                    terms: {
                      field: AGENT_NAME,
                    },
                    aggs: {
                      versions: {
                        terms: {
                          field: AGENT_VERSION,
                        }
                      }
                    }
                  },
                  environments: {
                    terms: {
                      field: SERVICE_ENVIRONMENT,
                    }
                  },
                  sample: {
                    top_metrics: {
                      metrics: [
                        { field: SERVICE_LANGUAGE_NAME } as const
                      ],
                      sort: {
                        '@timestamp': 'desc' as const,
                      }
                    }
                  }
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
      const agents = bucket.agents.buckets.map((agent) => ({
        name: agent.key as AgentName,
        versions: agent.versions.buckets.map(
          (version) => version.key as string
        ),
      }));

      return {
        serviceName: bucket.key as string,
        instances: bucket.instances.value,
        agents,
        environments: bucket.environments.buckets.map(
          (version) => version.key as string
        ),
        language: bucket.sample.top[0].metrics[SERVICE_LANGUAGE_NAME] as string,
      };
    }) ?? []
  );
}
