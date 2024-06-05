/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { getCloudProductTier } from './cloud_security_metering';
import {
  getCloudSecurityUsageRecord,
  getSearchQueryByCloudSecuritySolution,
} from './cloud_security_metering_task';

import type { ServerlessSecurityConfig } from '../config';
import type { CloudSecuritySolutions } from './types';
import type { ProductTier } from '../../common/product';
import { CLOUD_SECURITY_TASK_TYPE, CSPM, KSPM, CNVM, CLOUD_DEFEND } from './constants';
import { getCloudDefendUsageRecords } from './defend_for_containers_metering';

const mockEsClient = elasticsearchServiceMock.createStart().client.asInternalUser;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const chance = new Chance();

const cloudSecuritySolutions: CloudSecuritySolutions[] = [CSPM, KSPM, CNVM];

describe('getCloudSecurityUsageRecord', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return undefined if cloudSecuritySolution is missing', async () => {
    // Mock Elasticsearch search to throw an error
    mockEsClient.search.mockRejectedValue({});

    const projectId = chance.guid();
    const taskId = chance.guid();
    const cloudSecuritySolution = CSPM;

    const tier = 'essentials' as ProductTier;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toBeUndefined();
  });

  test.each(cloudSecuritySolutions)(
    'should return usageRecords with correct values for cspm, kspm, and cnvm when Elasticsearch response has aggregations',
    async (cloudSecuritySolution) => {
      // @ts-ignore
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'someRecord', _index: 'mockIndex' }] }, // mocking for indexHasDataInDateRange
      });

      // @ts-ignore
      mockEsClient.search.mockResolvedValueOnce({
        aggregations: {
          unique_assets: {
            value: 10,
          },
          min_timestamp: {
            value_as_string: '2023-07-30T15:11:41.738Z',
          },
        },
      });

      const projectId = chance.guid();
      const taskId = chance.guid();

      const tier = 'essentials' as ProductTier;

      const result = await getCloudSecurityUsageRecord({
        esClient: mockEsClient,
        projectId,
        logger,
        taskId,
        lastSuccessfulReport: new Date(),
        cloudSecuritySolution,
        tier,
      });

      expect(result).toEqual([
        {
          id: expect.stringContaining(
            `${CLOUD_SECURITY_TASK_TYPE}_${cloudSecuritySolution}_${projectId}`
          ),
          usage_timestamp: '2023-07-30T15:11:41.738Z',
          creation_timestamp: expect.any(String), // Expect a valid ISO string
          usage: {
            type: CLOUD_SECURITY_TASK_TYPE,
            sub_type: cloudSecuritySolution,
            quantity: 10,
            period_seconds: expect.any(Number),
          },
          source: {
            id: taskId,
            instance_group_id: projectId,
            metadata: {
              tier: 'essentials',
            },
          },
        },
      ]);
    }
  );

  it('should return undefined when Elasticsearch response does not have aggregations', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValue({});

    const projectId = chance.guid();
    const taskId = chance.guid();
    const cloudSecuritySolution = CSPM;

    const tier = 'essentials' as ProductTier;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined if an error occurs during Elasticsearch search', async () => {
    // Mock Elasticsearch search to throw an error
    mockEsClient.search.mockRejectedValue(new Error('Elasticsearch search error'));

    const projectId = chance.guid();
    const taskId = chance.guid();
    const cloudSecuritySolution = CSPM;

    const tier = 'essentials' as ProductTier;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      tier,
    });

    expect(result).toBeUndefined();
  });
});

describe('getSearchQueryByCloudSecuritySolution', () => {
  it('should return the correct search query for CSPM', () => {
    const searchFrom = new Date('2023-07-30T15:11:41.738Z');

    const result = getSearchQueryByCloudSecuritySolution('cspm', searchFrom);

    expect(result).toEqual({
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
          {
            term: {
              'rule.benchmark.posture_type': 'cspm',
            },
          },
          {
            terms: {
              'resource.sub_type': [
                // 'aws-ebs', we can't include EBS volumes until https://github.com/elastic/security-team/issues/9283 is resolved
                // 'aws-ec2', we can't include EC2 instances until https://github.com/elastic/security-team/issues/9254 is resolved
                'aws-s3',
                'aws-rds',
                'azure-disk',
                'azure-document-db-database-account',
                'azure-flexible-mysql-server-db',
                'azure-flexible-postgresql-server-db',
                'azure-mysql-server-db',
                'azure-postgresql-server-db',
                'azure-sql-server',
                'azure-storage-account',
                'azure-vm',
                'gcp-bigquery-dataset',
                'gcp-compute-disk',
                'gcp-compute-instance',
                'gcp-sqladmin-instance',
                'gcp-storage-bucket',
              ],
            },
          },
        ],
      },
    });
  });

  it('should return the correct search query for KSPM', () => {
    const searchFrom = new Date('2023-07-30T15:11:41.738Z');

    const result = getSearchQueryByCloudSecuritySolution('kspm', searchFrom);

    expect(result).toEqual({
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
          {
            term: {
              'rule.benchmark.posture_type': 'kspm',
            },
          },
          {
            terms: {
              'resource.sub_type': ['Node', 'node'],
            },
          },
        ],
      },
    });
  });

  it('should return the correct search query for CNVM', () => {
    const searchFrom = new Date('2023-07-30T15:11:41.738Z');

    const result = getSearchQueryByCloudSecuritySolution(CNVM, searchFrom);

    expect(result).toEqual({
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: 'now-24h',
              },
            },
          },
        ],
      },
    });
  });
});

describe('should return the relevant product tier', () => {
  it('should return the relevant product tier for cloud product line', async () => {
    const serverlessSecurityConfig = {
      enabled: true,
      developer: {},
      productTypes: [
        { product_line: 'endpoint', product_tier: 'essentials' },
        { product_line: 'cloud', product_tier: 'complete' },
      ],
    } as unknown as ServerlessSecurityConfig;

    const tier = getCloudProductTier(serverlessSecurityConfig, logger);

    expect(tier).toBe('complete');
  });

  it('should return none tier in case cloud product line is missing ', async () => {
    const serverlessSecurityConfig = {
      enabled: true,
      developer: {},
      productTypes: [{ product_line: 'endpoint', product_tier: 'complete' }],
    } as unknown as ServerlessSecurityConfig;

    const tier = getCloudProductTier(serverlessSecurityConfig, logger);

    expect(tier).toBe('none');
  });
});

describe('cloud defend metering', () => {
  it('should return usageRecords with correct values', async () => {
    const cloudSecuritySolution = 'cloud_defend';
    const agentId1 = chance.guid();
    const eventIngestedStr = '2024-05-28T12:10:51Z';
    const eventIngestedTimestamp = new Date(eventIngestedStr);

    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'someRecord',
            _index: 'mockIndex',
            _source: {
              'cloud_defend.block_action_enabled': true,
              'agent.id': agentId1,
              event: {
                ingested: eventIngestedStr,
              },
            },
          },
        ],
      },
    });

    const projectId = chance.guid();
    const taskId = chance.guid();

    const tier = 'essentials' as ProductTier;

    const result = await getCloudDefendUsageRecords({
      esClient: mockEsClient,
      projectId,
      taskId,
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution,
      logger,
      tier,
    });

    const roundedIngestedTimestamp = eventIngestedTimestamp;
    roundedIngestedTimestamp.setMinutes(0);
    roundedIngestedTimestamp.setSeconds(0);
    roundedIngestedTimestamp.setMilliseconds(0);

    expect(result).toEqual([
      {
        id: expect.stringContaining(
          `${projectId}_${agentId1}_${roundedIngestedTimestamp.toISOString()}`
        ),
        usage_timestamp: eventIngestedStr,
        creation_timestamp: expect.any(String),
        usage: {
          type: CLOUD_SECURITY_TASK_TYPE,
          sub_type: CLOUD_DEFEND,
          quantity: 1,
          period_seconds: 3600,
        },
        source: {
          id: taskId,
          instance_group_id: projectId,
          metadata: {
            tier: 'essentials',
          },
        },
      },
    ]);
  });

  it('should return an empty array when Elasticsearch returns an empty response', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({
      hits: {
        hits: [],
      },
    });
    const tier = 'essentials' as ProductTier;
    // Call the function with mock parameters
    const result = await getCloudDefendUsageRecords({
      esClient: mockEsClient,
      projectId: chance.guid(),
      taskId: chance.guid(),
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution: 'cloud_defend',
      logger,
      tier,
    });

    // Assert that the result is an empty array
    expect(result).toEqual([]);
  });

  it('should handle errors from Elasticsearch', async () => {
    // Mock Elasticsearch client's search method to throw an error
    mockEsClient.search.mockRejectedValueOnce(new Error('Elasticsearch query failed'));

    const tier = 'essentials' as ProductTier;

    // Call the function with mock parameters
    await getCloudDefendUsageRecords({
      esClient: mockEsClient,
      projectId: chance.guid(),
      taskId: chance.guid(),
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution: 'cloud_defend',
      logger,
      tier,
    });

    // Assert that the logger's error method was called with the correct error message
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch cloud_defend metering data Error: Elasticsearch query failed'
    );
  });

  it('should return usageRecords when Elasticsearch returns multiple records', async () => {
    // Mock Elasticsearch response with multiple records
    const agentId1 = chance.guid();
    const agentId2 = chance.guid();
    const eventIngestedStr1 = '2024-05-28T12:10:51Z';
    const eventIngestedStr2 = '2024-05-28T13:10:51Z';

    // @ts-ignore
    mockEsClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _id: 'record1',
            _index: 'mockIndex',
            _source: {
              'cloud_defend.block_action_enabled': true,
              'agent.id': agentId1,
              event: {
                ingested: eventIngestedStr1,
              },
            },
          },
          {
            _id: 'record2',
            _index: 'mockIndex',
            _source: {
              'cloud_defend.block_action_enabled': true,
              'agent.id': agentId2,
              event: {
                ingested: eventIngestedStr2,
              },
            },
          },
        ],
      },
    });
    const tier = 'essentials' as ProductTier;

    // Call the function with mock parameters
    const result = await getCloudDefendUsageRecords({
      esClient: mockEsClient,
      projectId: chance.guid(),
      taskId: chance.guid(),
      lastSuccessfulReport: new Date(),
      cloudSecuritySolution: 'cloud_defend',
      logger,
      tier,
    });

    // Assert that the result contains usage records for both records
    expect(result).toHaveLength(2);
  });
});
