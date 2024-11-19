/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';

import { AGENTS_INDEX } from '../../../common';

import { createAppContextStartContractMock } from '../../mocks';

import { appContextService } from '../app_context';

import { getAgentStatusForAgentPolicy } from './status';

describe('getAgentStatusForAgentPolicy', () => {
  beforeEach(async () => {
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
    appContextService.start(
      createAppContextStartContractMock({}, false, {
        withoutSpaceExtensions: soClient as any,
      })
    );
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

  it('calls esClient.search with correct parameters when agentPolicyIds are provided', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        aggregations: {
          status: {
            buckets: [
              { key: 'online', doc_count: 2 },
              { key: 'error', doc_count: 1 },
            ],
          },
        },
      }),
    };

    const soClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          { id: 'agentPolicyId1', attributes: { name: 'Policy 1' } },
          { id: 'agentPolicyId2', attributes: { name: 'Policy 2' } },
        ],
      }),
    };

    const agentPolicyIds = ['agentPolicyId1', 'agentPolicyId2'];
    const filterKuery = 'filterKuery';
    const spaceId = 'spaceId';

    await getAgentStatusForAgentPolicy(
      esClient as any,
      soClient as any,
      undefined,
      filterKuery,
      spaceId,
      agentPolicyIds
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENTS_INDEX,
        size: 0,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                terms: {
                  policy_id: agentPolicyIds,
                },
              }),
            ]),
          }),
        }),
        aggregations: expect.objectContaining({
          status: expect.objectContaining({
            terms: expect.objectContaining({
              field: 'status',
              size: expect.any(Number),
            }),
          }),
        }),
      })
    );
  });
});
