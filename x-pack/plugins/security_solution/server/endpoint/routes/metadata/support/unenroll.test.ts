/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { findAllUnenrolledAgentIds } from './unenroll';
import { elasticsearchServiceMock } from '../../../../../../../../src/core/server/mocks';
import { AgentService } from '../../../../../../fleet/server/services';
import {
  createMockAgentService,
  createPackagePolicyServiceMock,
} from '../../../../../../fleet/server/mocks';
import { Agent, PackagePolicy } from '../../../../../../fleet/common/types/models';
import { PackagePolicyServiceInterface } from '../../../../../../fleet/server';

describe('test find all unenrolled Agent id', () => {
  let mockElasticsearchClient: jest.Mocked<ElasticsearchClient>;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockPackagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;

  beforeEach(() => {
    mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    mockAgentService = createMockAgentService();
    mockPackagePolicyService = createPackagePolicyServiceMock();
  });

  it('can find all unerolled endpoint agent ids', async () => {
    mockPackagePolicyService.list
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: 'abc123',
          } as unknown as PackagePolicy,
        ],
        total: 1,
        perPage: 10,
        page: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 1,
        perPage: 10,
        page: 1,
      });
    mockAgentService.listAgents
      .mockImplementationOnce(() =>
        Promise.resolve({
          agents: [
            {
              id: 'id1',
            } as unknown as Agent,
          ],
          total: 2,
          page: 1,
          perPage: 1,
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          agents: [
            {
              id: 'id2',
            } as unknown as Agent,
          ],
          total: 2,
          page: 1,
          perPage: 1,
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          agents: [],
          total: 2,
          page: 1,
          perPage: 1,
        })
      );
    const endpointPolicyIds = ['test-endpoint-policy-id'];
    const agentIds = await findAllUnenrolledAgentIds(
      mockAgentService,
      mockElasticsearchClient,
      endpointPolicyIds
    );

    expect(agentIds).toBeTruthy();
    expect(agentIds).toEqual(['id1', 'id2']);

    expect(mockAgentService.listAgents).toHaveBeenNthCalledWith(1, mockElasticsearchClient, {
      page: 1,
      perPage: 1000,
      showInactive: true,
      kuery: `(active : false) OR (active: true AND NOT policy_id:("${endpointPolicyIds[0]}"))`,
    });
  });
});
