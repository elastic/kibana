/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../mocks';

import { agentPolicyUpdateEventHandler } from './agent_policy_update';
import { appContextService } from './app_context';
import { getAgentById, getAgentPolicyForAgent, getAgentsByKuery } from './agents';

jest.mock('./agents/crud', () => ({
  ...jest.requireActual('./agents/crud'),
  getAgentsByKuery: jest.fn(),
  getAgentById: jest.fn(),
  getAgentPolicyForAgent: jest.fn(),
}));
jest.mock('./api_keys');

describe('agentPolicyUpdateEventHandler', () => {
  describe('deleted', () => {
    it('should unenroll agentless agents', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      appContextService.start(createAppContextStartContractMock());

      jest
        .mocked(getAgentsByKuery)
        .mockResolvedValueOnce({
          agents: [{ id: 'agent1' }],
        } as any)
        .mockResolvedValueOnce({
          agents: [],
        } as any);
      jest.mocked(getAgentById).mockResolvedValue({
        id: 'agent1',
      } as any);
      jest.mocked(getAgentPolicyForAgent).mockResolvedValue({
        supports_agentless: true,
      } as any);
      await agentPolicyUpdateEventHandler(esClient, 'deleted', 'test1');

      expect(esClient.update).toBeCalledWith(
        expect.objectContaining({
          id: 'agent1',
          body: {
            doc: expect.objectContaining({
              unenrollment_started_at: expect.anything(),
            }),
          },
        })
      );
    });
  });
});
