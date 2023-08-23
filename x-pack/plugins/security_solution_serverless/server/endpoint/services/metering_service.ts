/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ENDPOINT_HEARTBEAT_INDEX } from '@kbn/security-solution-plugin/common/endpoint/constants';
import type { EndpointHeartbeat } from '@kbn/security-solution-plugin/common/endpoint/types';

import { ProductLine, type ProductTier } from '../../../common/product';

import type { UsageRecord, MeteringCallbackInput } from '../../types';
import type { ServerlessSecurityConfig } from '../../config';

// 1 hour
const SAMPLE_PERIOD_SECONDS = 3600;
const THRESHOLD_MINUTES = 30;

export class EndpointMeteringService {
  private tier: ProductTier | undefined;

  public getUsageRecords = async ({
    taskId,
    cloudSetup,
    esClient,
    abortController,
    lastSuccessfulReport,
    config,
  }: MeteringCallbackInput): Promise<UsageRecord[]> => {
    this.setTier(config);

    const heartbeatsResponse = await this.getHeartbeatsSince(
      esClient,
      abortController,
      lastSuccessfulReport
    );

    if (!heartbeatsResponse?.hits?.hits) {
      return [];
    }

    if (!this.tier) {
      throw new Error(
        `no product tier information found for heartbeats: ${JSON.stringify(
          heartbeatsResponse.hits.hits
        )}`
      );
    }

    return heartbeatsResponse.hits.hits.reduce((acc, { _source }) => {
      if (!_source) {
        return acc;
      }

      const { agent, event } = _source;
      const record = this.buildMeteringRecord({
        agentId: agent.id,
        timestampStr: event.ingested,
        taskId,
        projectId: cloudSetup?.serverless?.projectId,
      });

      return [...acc, record];
    }, [] as UsageRecord[]);
  };

  private async getHeartbeatsSince(
    esClient: ElasticsearchClient,
    abortController: AbortController,
    since?: Date
  ): Promise<SearchResponse<EndpointHeartbeat, Record<string, AggregationsAggregate>>> {
    const thresholdDate = new Date(Date.now() - THRESHOLD_MINUTES * 60 * 1000);
    const searchFrom = since && since > thresholdDate ? since : thresholdDate;

    return esClient.search<EndpointHeartbeat>(
      {
        index: ENDPOINT_HEARTBEAT_INDEX,
        sort: 'event.ingested',
        query: {
          range: {
            'event.ingested': {
              gt: searchFrom.toISOString(),
            },
          },
        },
      },
      { signal: abortController.signal, ignore: [404] }
    );
  }

  private buildMeteringRecord({
    agentId,
    timestampStr,
    taskId,
    projectId = '',
  }: {
    agentId: string;
    timestampStr: string;
    taskId: string;
    projectId?: string;
  }): UsageRecord {
    const timestamp = new Date(timestampStr);
    timestamp.setMinutes(0);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);

    return {
      id: `endpoint-${agentId}-${timestamp}`,
      usage_timestamp: timestampStr,
      creation_timestamp: timestampStr,
      usage: {
        type: 'security_solution_endpoint',
        period_seconds: SAMPLE_PERIOD_SECONDS,
        quantity: 1,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
        metadata: {
          tier: this.tier,
        },
      },
    };
  }

  private setTier(config: ServerlessSecurityConfig) {
    if (this.tier) {
      return;
    }

    const endpoint = config.productTypes.find(
      (productType) => productType.product_line === ProductLine.endpoint
    );
    this.tier = endpoint?.product_tier;
  }
}

export const endpointMeteringService = new EndpointMeteringService();
