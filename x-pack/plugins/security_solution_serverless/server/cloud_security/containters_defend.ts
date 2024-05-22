/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CLOUD_DEFEND, CLOUD_SECURITY_TASK_TYPE, CLOUD_DEFEND_HEARTBEAT_INDEX } from './constants';
import type { Tier, UsageRecord } from '../types';
import type { CloudSecurityMeteringCallbackInput } from './types';
import { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';

export interface CloudDefendHeartbeat {
  '@timestamp': string;
  'agent.id': string;
  event: {
    ingested: string;
  };
}

const buildMeteringRecord = (
  agentId: string,
  timestampStr: string,
  taskId: string,
  tier: Tier,
  projectId: string
): UsageRecord => {
  const timestamp = new Date(timestampStr);
  timestamp.setMinutes(0);
  timestamp.setSeconds(0);
  timestamp.setMilliseconds(0);

  const usageRecord = {
    id: `container-defend-${agentId}-${timestamp.toISOString()}`,
    usage_timestamp: timestampStr,
    creation_timestamp: timestampStr,
    usage: {
      type: CLOUD_SECURITY_TASK_TYPE,
      sub_type: CLOUD_DEFEND,
      period_seconds: 3600,
      quantity: 1,
    },
    source: {
      id: taskId,
      instance_group_id: projectId,
      metadata: {
        tier: tier,
      },
    },
  };

  return usageRecord;
};
export const getHeartbeatRecords = async (
  esClient: ElasticsearchClient,
  searchFrom: Date
): Promise<SearchResponse<CloudDefendHeartbeat, Record<string, AggregationsAggregate>>> => {
  return await esClient.search<CloudDefendHeartbeat>(
    {
      index: CLOUD_DEFEND_HEARTBEAT_INDEX,
      sort: 'event.ingested',
      query: {
        bool: {
          must: [
            {
              range: {
                'event.ingested': {
                  gt: searchFrom.toISOString(),
                },
              },
            },
            {
              term: {
                'cloud_defend.block_action_enabled': true,
              },
            },
          ],
        },
      },
    },
    { ignore: [404] }
  );
};

export const getCloudDefendUsageRecord = async ({
  esClient,
  projectId,
  taskId,
  lastSuccessfulReport,
  cloudSecuritySolution,
  tier,
  logger,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord[] | undefined> => {
  try {
    const usageRecords = await getHeartbeatRecords(esClient, lastSuccessfulReport);

    logger.error(`usage records: ${JSON.stringify(usageRecords)}`);

    if (!usageRecords?.hits?.hits?.length) {
      return [];
    }

    const records = usageRecords.hits.hits.reduce((acc, { _source }) => {
      if (!_source) {
        return acc;
      }

      const { event } = _source;
      const record = buildMeteringRecord(
        _source['agent.id'],
        event.ingested,
        taskId,
        tier,
        projectId
      );

      return [...acc, record];
    }, [] as UsageRecord[]);

    return records;
  } catch (err) {
    logger.error(`Failed to fetch ${cloudSecuritySolution} metering data ${err}`);
  }
};
