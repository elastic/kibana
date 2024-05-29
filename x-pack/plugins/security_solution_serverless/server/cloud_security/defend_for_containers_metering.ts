/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  AggregationsAggregate,
  SearchResponse,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { Tier, UsageRecord } from '../types';
import type { CloudSecurityMeteringCallbackInput } from './types';
import { CLOUD_DEFEND, CLOUD_SECURITY_TASK_TYPE, CLOUD_DEFEND_HEARTBEAT_INDEX } from './constants';

const BATCH_SIZE = 1000;
const SAMPLE_WEIGHT_SECONDS = 3600; // 1 Hour

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
  const creationTimestamp = new Date();
  const usageRecord = {
    id: `${projectId}_${agentId}_${timestamp.toISOString()}`,
    usage_timestamp: timestampStr,
    creation_timestamp: creationTimestamp.toISOString(),
    usage: {
      type: CLOUD_SECURITY_TASK_TYPE,
      sub_type: CLOUD_DEFEND,
      period_seconds: SAMPLE_WEIGHT_SECONDS,
      quantity: 1,
    },
    source: {
      id: taskId,
      instance_group_id: projectId,
      metadata: {
        tier,
      },
    },
  };

  return usageRecord;
};
export const getUsageRecords = async (
  esClient: ElasticsearchClient,
  searchFrom: Date,
  searchAfter?: SortResults
): Promise<SearchResponse<CloudDefendHeartbeat, Record<string, AggregationsAggregate>>> => {
  return esClient.search<CloudDefendHeartbeat>(
    {
      index: CLOUD_DEFEND_HEARTBEAT_INDEX,
      size: BATCH_SIZE,
      sort: [{ 'event.ingested': 'asc' }, { 'agent.id': 'asc' }],
      search_after: searchAfter,
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

export const getCloudDefendUsageRecords = async ({
  esClient,
  projectId,
  taskId,
  lastSuccessfulReport,
  cloudSecuritySolution,
  tier,
  logger,
}: CloudSecurityMeteringCallbackInput): Promise<UsageRecord[] | undefined> => {
  try {
    let allRecords: UsageRecord[] = [];
    let searchAfter: SortResults | undefined;
    let fetchMore = true;

    while (fetchMore) {
      const usageRecords = await getUsageRecords(esClient, lastSuccessfulReport, searchAfter);

      if (!usageRecords?.hits?.hits?.length) {
        break;
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

      allRecords = [...allRecords, ...records];

      if (usageRecords.hits.hits.length < BATCH_SIZE) {
        fetchMore = false;
      } else {
        searchAfter = usageRecords.hits.hits[usageRecords.hits.hits.length - 1].sort;
      }
    }

    return allRecords;
  } catch (err) {
    logger.error(`Failed to fetch ${cloudSecuritySolution} metering data ${err}`);
  }
};
