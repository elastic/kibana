/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ENDPOINT_HEARTBEAT_INDEX } from '@kbn/security-solution-plugin/common/endpoint/constants';
import type { EndpointHeartbeat } from '@kbn/security-solution-plugin/common/endpoint/types';

import { ProductLine, ProductTier } from '../../../common/product';

import type { UsageRecord, MeteringCallbackInput } from '../../types';
import type { ServerlessSecurityConfig } from '../../config';

import { METERING_TASK } from '../constants/metering';

export class EndpointMeteringService {
  private type: ProductLine.endpoint | `${ProductLine.cloud}_${ProductLine.endpoint}` | undefined;
  private tier: ProductTier | undefined;

  public getUsageRecords = async ({
    taskId,
    cloudSetup,
    esClient,
    abortController,
    lastSuccessfulReport,
    config,
    logger,
  }: MeteringCallbackInput): Promise<UsageRecord[]> => {
    this.setType(config);
    if (!this.type) {
      return [];
    }

    this.setTier(config);

    const heartbeatsResponse = await this.getHeartbeatsSince(
      esClient,
      abortController,
      lastSuccessfulReport
    );

    if (!heartbeatsResponse?.hits?.hits) {
      return [];
    }

    return heartbeatsResponse.hits.hits.reduce((acc, { _source }) => {
      if (!_source) {
        return acc;
      }

      const { agent, event } = _source;
      const record = this.buildMeteringRecord({
        logger,
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
    const thresholdDate = new Date(Date.now() - METERING_TASK.THRESHOLD_MINUTES * 60 * 1000);
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
    logger,
    agentId,
    timestampStr,
    taskId,
    projectId,
  }: {
    logger: Logger;
    agentId: string;
    timestampStr: string;
    taskId: string;
    projectId?: string;
  }): UsageRecord {
    const timestamp = new Date(timestampStr);
    timestamp.setMinutes(0);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);

    const usageRecord = {
      // keep endpoint instead of this.type as id prefix so
      // we don't double count in the event of add-on changes
      id: `endpoint-${agentId}-${timestamp.toISOString()}`,
      usage_timestamp: timestampStr,
      creation_timestamp: timestampStr,
      usage: {
        // type postfix is used to determine the PLI to bill
        type: `${METERING_TASK.USAGE_TYPE_PREFIX}${this.type}`,
        period_seconds: METERING_TASK.SAMPLE_PERIOD_SECONDS,
        quantity: 1,
      },
      source: {
        id: taskId,
        instance_group_id: projectId || METERING_TASK.MISSING_PROJECT_ID,
        metadata: {
          tier: this.tier,
        },
      },
    };

    if (!projectId) {
      logger.error(`project id missing for record: ${JSON.stringify(usageRecord)}`);
    }

    return usageRecord;
  }

  private setType(config: ServerlessSecurityConfig) {
    if (this.type) {
      return;
    }

    let hasCloudAddOn = false;
    let hasEndpointAddOn = false;
    config.productTypes.forEach((productType) => {
      if (productType.product_line === ProductLine.cloud) {
        hasCloudAddOn = true;
      }
      if (productType.product_line === ProductLine.endpoint) {
        hasEndpointAddOn = true;
      }
    });

    if (hasEndpointAddOn) {
      this.type = ProductLine.endpoint;
      return;
    }
    if (hasCloudAddOn) {
      this.type = `${ProductLine.cloud}_${ProductLine.endpoint}`;
    }
  }

  private setTier(config: ServerlessSecurityConfig) {
    if (this.tier) {
      return;
    }

    const product = config.productTypes.find(
      (productType) =>
        // tiers are always matching so either is fine
        productType.product_line === ProductLine.endpoint ||
        productType.product_line === ProductLine.cloud
    );
    // default essentials is safe since we only reach tier if add-on exists
    this.tier = product?.product_tier || ProductTier.essentials;
  }
}

export const endpointMeteringService = new EndpointMeteringService();
