/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { type ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { EndpointHeartbeat } from '@kbn/security-solution-plugin/common/endpoint/types';
import { ENDPOINT_HEARTBEAT_INDEX } from '@kbn/security-solution-plugin/common/endpoint/constants';

import { ProductLine, ProductTier } from '../../../common/product';

import type { ServerlessSecurityConfig } from '../../config';
import { METERING_TASK } from '../constants/metering';

import { EndpointMeteringService } from './metering_service';

describe('EndpointMeteringService', () => {
  function buildDefaultUsageRecordArgs() {
    return {
      logger: loggingSystemMock.createLogger(),
      taskId: 'test-task-id',
      cloudSetup: {
        serverless: {
          projectId: 'test-project-id',
        },
      } as CloudSetup,
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      abortController: new AbortController(),
      lastSuccessfulReport: new Date(),
      config: {
        productTypes: [
          {
            product_line: ProductLine.endpoint,
            product_tier: ProductTier.essentials,
          },
        ],
      } as ServerlessSecurityConfig,
    };
  }

  function buildEsSearchResponse(
    {
      agentId,
      timestamp,
    }: {
      agentId: string;
      timestamp: Date;
    } = {
      agentId: 'test-agent-id',
      timestamp: new Date(),
    }
  ): SearchResponse<EndpointHeartbeat, Record<string, AggregationsAggregate>> {
    return {
      hits: {
        hits: [
          {
            _index: ENDPOINT_HEARTBEAT_INDEX,
            _id: 'test-heartbeat-doc-id',
            _source: {
              agent: {
                id: agentId,
              },
              event: {
                ingested: timestamp.toISOString(),
              },
            },
          },
        ],
      },
    } as SearchResponse<EndpointHeartbeat, Record<string, AggregationsAggregate>>;
  }

  it.each(Object.values(ProductTier))(
    'can correctly getUsageRecords for %s tier',
    async (tier: ProductTier) => {
      const esSearchResponse = buildEsSearchResponse();
      const heartbeatDocSrc = esSearchResponse.hits.hits[0]._source;
      const agentId = heartbeatDocSrc!.agent.id;
      const timestamp = new Date(heartbeatDocSrc!.event.ingested);
      timestamp.setMinutes(0);
      timestamp.setSeconds(0);
      timestamp.setMilliseconds(0);

      const args = buildDefaultUsageRecordArgs();
      args.config.productTypes[0] = {
        ...args.config.productTypes[0],
        product_tier: tier,
      };
      (args.esClient as ElasticsearchClientMock).search.mockResolvedValueOnce(esSearchResponse);
      const endpointMeteringService = new EndpointMeteringService();
      const { records } = await endpointMeteringService.getUsageRecords(args);

      expect(records[0]).toEqual({
        id: `endpoint-${agentId}-${timestamp.toISOString()}`,
        usage_timestamp: heartbeatDocSrc!.event.ingested,
        creation_timestamp: heartbeatDocSrc!.event.ingested,
        usage: {
          type: `${METERING_TASK.USAGE_TYPE_PREFIX}endpoint`,
          period_seconds: METERING_TASK.SAMPLE_PERIOD_SECONDS,
          quantity: 1,
        },
        source: {
          id: args.taskId,
          instance_group_id: args.cloudSetup.serverless.projectId,
          metadata: {
            tier,
          },
        },
      });
    }
  );

  it.each([ProductLine.endpoint, ProductLine.cloud])(
    'can correctly getUsageRecords for %s product line',
    async (productLine: ProductLine) => {
      const esSearchResponse = buildEsSearchResponse();
      const heartbeatDocSrc = esSearchResponse.hits.hits[0]._source;
      const agentId = heartbeatDocSrc!.agent.id;
      const timestamp = new Date(heartbeatDocSrc!.event.ingested);
      timestamp.setMinutes(0);
      timestamp.setSeconds(0);
      timestamp.setMilliseconds(0);

      const args = buildDefaultUsageRecordArgs();
      args.config.productTypes[0] = {
        ...args.config.productTypes[0],
        product_line: productLine,
      };
      (args.esClient as ElasticsearchClientMock).search.mockResolvedValueOnce(esSearchResponse);
      const endpointMeteringService = new EndpointMeteringService();
      const { records } = await endpointMeteringService.getUsageRecords(args);
      const usageTypePostfix =
        productLine === ProductLine.endpoint
          ? productLine
          : `${ProductLine.cloud}_${ProductLine.endpoint}`;

      expect(records[0]).toEqual({
        id: `endpoint-${agentId}-${timestamp.toISOString()}`,
        usage_timestamp: heartbeatDocSrc!.event.ingested,
        creation_timestamp: heartbeatDocSrc!.event.ingested,
        usage: {
          type: `${METERING_TASK.USAGE_TYPE_PREFIX}${usageTypePostfix}`,
          period_seconds: METERING_TASK.SAMPLE_PERIOD_SECONDS,
          quantity: 1,
        },
        source: {
          id: args.taskId,
          instance_group_id: args.cloudSetup.serverless.projectId,
          metadata: {
            tier: args.config.productTypes[0].product_tier,
          },
        },
      });
    }
  );
});
