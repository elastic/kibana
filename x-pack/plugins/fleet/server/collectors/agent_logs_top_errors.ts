/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { appContextService } from '../services';

export interface AgentLogsData {
  agent_logs_top_errors: string[];
  fleet_server_logs_top_errors: string[];
}

const DEFAULT_LOGS_DATA = {
  agent_logs_top_errors: [],
  fleet_server_logs_top_errors: [],
};

export async function getAgentLogsTopErrors(
  esClient?: ElasticsearchClient
): Promise<AgentLogsData> {
  if (!esClient) {
    return DEFAULT_LOGS_DATA;
  }
  try {
    const queryTopMessages = (index: string) =>
      esClient.search({
        index,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'log.level': 'error',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1h',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          message_sample: {
            sampler: {
              shard_size: 200,
            },
            aggs: {
              categories: {
                categorize_text: {
                  field: 'message',
                  size: 10,
                },
              },
            },
          },
        },
      });

    const transformBuckets = (resp: any) =>
      ((resp?.aggregations?.message_sample as any)?.categories?.buckets ?? [])
        .slice(0, 3)
        .map((bucket: any) => bucket.key);

    const agentResponse = await queryTopMessages('logs-elastic_agent-*');

    const fleetServerResponse = await queryTopMessages('logs-elastic_agent.fleet_server-*');

    return {
      agent_logs_top_errors: transformBuckets(agentResponse),
      fleet_server_logs_top_errors: transformBuckets(fleetServerResponse),
    };
  } catch (error) {
    if (error.statusCode === 404) {
      appContextService.getLogger().debug('Index pattern logs-elastic_agent* does not exist yet.');
    } else {
      throw error;
    }
    return DEFAULT_LOGS_DATA;
  }
}
