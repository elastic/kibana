/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';

import { createAppContextStartContractMock } from '../../mocks';

import { appContextService } from '../app_context';

import { getAgentStatusForAgentPolicy } from './status';

describe('getAgentStatusForAgentPolicy', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
  });

  it('should return agent status for agent policy', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          status: {
            buckets: [
              {
                key: 'online',
                doc_count: 1,
              },
              {
                key: 'error',
                doc_count: 2,
              },
            ],
          },
        },
      }),
    };

    const soClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'agentPolicyId',
            attributes: {
              name: 'Policy 1',
            },
          },
        ],
      }),
    };
    const agentPolicyId = 'agentPolicyId';
    const filterKuery = 'filterKuery';
    const spaceId = 'spaceId';

    const result = await getAgentStatusForAgentPolicy(
      esClient as any,
      soClient as any,
      agentPolicyId,
      filterKuery,
      spaceId
    );

    expect(result).toEqual(
      expect.objectContaining({
        active: 3,
        all: 3,
        error: 2,
        events: 0,
        inactive: 0,
        offline: 0,
        online: 1,
        other: 0,
        total: 3,
        unenrolled: 0,
        updating: 0,
      })
    );

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('retries on 503', async () => {
    const esClient = {
      search: jest
        .fn()
        .mockRejectedValueOnce(
          new EsErrors.ResponseError({ warnings: [], meta: {} as any, statusCode: 503 })
        )
        .mockResolvedValue({
          aggregations: {
            status: {
              buckets: [
                {
                  key: 'online',
                  doc_count: 1,
                },
                {
                  key: 'error',
                  doc_count: 2,
                },
              ],
            },
          },
        }),
    };

    const soClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            id: 'agentPolicyId',
            attributes: {
              name: 'Policy 1',
            },
          },
        ],
      }),
    };
    const agentPolicyId = 'agentPolicyId';
    const filterKuery = 'filterKuery';
    const spaceId = 'spaceId';

    const result = await getAgentStatusForAgentPolicy(
      esClient as any,
      soClient as any,
      agentPolicyId,
      filterKuery,
      spaceId
    );

    expect(result).toEqual(
      expect.objectContaining({
        active: 3,
        all: 3,
        error: 2,
        events: 0,
        inactive: 0,
        offline: 0,
        online: 1,
        other: 0,
        total: 3,
        unenrolled: 0,
        updating: 0,
      })
    );

    expect(esClient.search).toHaveBeenCalledTimes(2);
  });
});
