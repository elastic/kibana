/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const AGENT_LOGS_INDEX_PATTERN = 'logs-elastic_agent-*';
const MAX_MESSAGE_COUNT = 100;

export interface AgentPanicLogsData {
  agent_logs_panics_last_hour: Array<{ message: string; '@timestamp': string }>;
}

interface MaybeLogsDoc {
  message?: string;
  '@timestamp'?: string;
}
const DEFAULT_LOGS_DATA = {
  agent_logs_panics_last_hour: [],
};

export async function getPanicLogsLastHour(
  esClient?: ElasticsearchClient
): Promise<AgentPanicLogsData> {
  if (!esClient) {
    return DEFAULT_LOGS_DATA;
  }

  const res = await esClient.search<MaybeLogsDoc>({
    index: AGENT_LOGS_INDEX_PATTERN,
    size: MAX_MESSAGE_COUNT,
    sort: [{ '@timestamp': 'desc' }],
    _source: ['message', '@timestamp'],
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: 'now-1h',
              },
            },
          },
          {
            match: {
              message: 'panic',
            },
          },
        ],
      },
    },
  });

  const panicLogsLastHour = res.hits.hits.map((hit) => ({
    message: hit._source?.message || '',
    '@timestamp': hit._source?.['@timestamp'] || '',
  }));

  return {
    agent_logs_panics_last_hour: panicLogsLastHour,
  };
}
