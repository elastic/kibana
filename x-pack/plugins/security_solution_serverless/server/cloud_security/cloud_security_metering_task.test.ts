/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  CNVM_POLICY_TEMPLATE,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { CLOUD_SECURITY_TASK_TYPE } from './cloud_security_metering';
import { getCloudSecurityUsageRecord } from './cloud_security_metering_task';
import type { PostureType } from './types';

const mockEsClient = elasticsearchServiceMock.createStart().client.asInternalUser;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const chance = new Chance();

const postureTypes: PostureType[] = [
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  CNVM_POLICY_TEMPLATE,
];

describe('getCspmUsageRecord', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return undefined if postureType is missing', async () => {
    // Mock Elasticsearch search to throw an error
    mockEsClient.search.mockRejectedValue({});

    const projectId = chance.guid();
    const taskId = chance.guid();
    const postureType = CSPM_POLICY_TEMPLATE;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      postureType,
    });

    expect(result).toBeUndefined();
  });

  test.each(postureTypes)(
    'should return usageRecords with correct values for cspm and kspm when Elasticsearch response has aggregations',
    async (postureType) => {
      // @ts-ignore
      mockEsClient.search.mockResolvedValue({
        aggregations: {
          unique_resources: {
            value: 10,
          },
          min_timestamp: {
            value_as_string: '2023-07-30T15:11:41.738Z',
          },
        },
      });

      const projectId = chance.guid();
      const taskId = chance.guid();

      const result = await getCloudSecurityUsageRecord({
        esClient: mockEsClient,
        projectId,
        logger,
        taskId,
        lastSuccessfulReport: new Date(),
        postureType,
      });

      expect(result).toEqual({
        id: `${CLOUD_SECURITY_TASK_TYPE}:${postureType}`,
        usage_timestamp: '2023-07-30T15:11:41.738Z',
        creation_timestamp: expect.any(String), // Expect a valid ISO string
        usage: {
          type: CLOUD_SECURITY_TASK_TYPE,
          sub_type: postureType,
          quantity: 10,
          period_seconds: expect.any(Number),
        },
        source: {
          id: taskId,
          instance_group_id: projectId,
        },
      });
    }
  );

  it('should return undefined when Elasticsearch response does not have aggregations', async () => {
    // @ts-ignore
    mockEsClient.search.mockResolvedValue({});

    const projectId = chance.guid();
    const taskId = chance.guid();
    const postureType = CSPM_POLICY_TEMPLATE;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      postureType,
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined if an error occurs during Elasticsearch search', async () => {
    // Mock Elasticsearch search to throw an error
    mockEsClient.search.mockRejectedValue(new Error('Elasticsearch search error'));

    const projectId = chance.guid();
    const taskId = chance.guid();
    const postureType = CSPM_POLICY_TEMPLATE;

    const result = await getCloudSecurityUsageRecord({
      esClient: mockEsClient,
      projectId,
      logger,
      taskId,
      lastSuccessfulReport: new Date(),
      postureType,
    });

    expect(result).toBeUndefined();
  });
});
