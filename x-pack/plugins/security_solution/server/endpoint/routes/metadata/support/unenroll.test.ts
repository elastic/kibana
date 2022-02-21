/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findAllUnenrolledAgentIds } from './unenroll';
import { AgentClient } from '../../../../../../fleet/server/services';
import {
  createMockAgentClient,
  createPackagePolicyServiceMock,
} from '../../../../../../fleet/server/mocks';
import { Agent, PackagePolicy } from '../../../../../../fleet/common/types/models';
import { PackagePolicyServiceInterface } from '../../../../../../fleet/server';

describe('test find all unenrolled Agent id', () => {
  let mockAgentClient: jest.Mocked<AgentClient>;
  let mockPackagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;

  beforeEach(() => {
    mockAgentClient = createMockAgentClient();
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
    mockAgentClient.listAgents
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
    const agentIds = await findAllUnenrolledAgentIds(mockAgentClient, endpointPolicyIds);

    expect(agentIds).toBeTruthy();
    expect(agentIds).toEqual(['id1', 'id2']);

    expect(mockAgentClient.listAgents).toHaveBeenNthCalledWith(1, {
      page: 1,
      perPage: 1000,
      showInactive: true,
      kuery: `(active : false) OR (active: true AND NOT policy_id:("${endpointPolicyIds[0]}"))`,
    });
  });
});
