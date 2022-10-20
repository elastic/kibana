/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/typesWithBodyKey";
import { AGENT_NAME, AGENT_VERSION, SERVICE_ENVIRONMENT, SERVICE_NAME, SERVICE_NODE_NAME } from "@kbn/apm-plugin/common/elasticsearch_fieldnames";
import { AgentName } from "@kbn/apm-plugin/typings/es_schemas/ui/fields/agent";
import { ProcessorEvent } from "@kbn/observability-plugin/common/processor_event";
import { kqlQuery, rangeQuery } from "@kbn/observability-plugin/server/utils/queries";
import { RandomSampler } from "../../../lib/helpers/get_random_sampler";
import { AgenItemsSetup } from "./get_agent_instances_items";

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

  return [{ term: { [AGENT_NAME]: agentName } }];
}

interface AggregationParams {
  serviceName: string;
  kuery: string;
  setup: AgenItemsSetup;
  maxNumServices: number;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}

export async function getAgentInstancesDetails({
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
    'get_agent_instances_details',
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
              ...kqlQuery(kuery),
              ...serviceNameQuery(serviceName),
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
                  serviceNodes: {
                    terms: {
                      field: SERVICE_NODE_NAME,
                      size: 50,
                    },
                    aggs: {
                      environments: {
                        terms: {
                          field: SERVICE_ENVIRONMENT,
                        }
                      },
                      sample: {
                        top_metrics: {
                          metrics: [
                            { field: AGENT_NAME } as const,
                            { field: AGENT_VERSION } as const,
                          ],
                          sort: {
                            '@timestamp': 'desc' as const,
                          }
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
    }
  );

  return (
    response.aggregations?.sample.services.buckets.map((bucket) => {
      const agents = bucket.serviceNodes.buckets.map((agentInstance) => ({
        agentId: agentInstance.key as string,
        environments: agentInstance.environments.buckets.map(
          (environmentBucket) => environmentBucket.key as string
        ),
        agentName: agentInstance.sample.top[0].metrics[
          AGENT_NAME
        ] as AgentName,
        agentVersion: agentInstance.sample.top[0].metrics[
          AGENT_VERSION
        ] as string,
        lastReport: agentInstance.sample.top[0].sort[0] as string,
      }));

      return agents;
    }).flatMap((agentInstance) => agentInstance) ?? []
  );
}
