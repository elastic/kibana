/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { createAgentActionFromPolicyAction } from './state_new_actions';
import { OutputType, Agent, AgentPolicyAction } from '../../../types';

jest.mock('../../app_context', () => ({
  appContextService: {
    getEncryptedSavedObjects: () => ({
      getDecryptedAsInternalUser: () => ({
        attributes: {
          default_api_key: 'MOCK_API_KEY',
        },
      }),
    }),
  },
}));

describe('test agent checkin new action services', () => {
  describe('createAgentActionFromPolicyAction()', () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockAgent: Agent = {
      id: 'agent1',
      active: true,
      type: 'PERMANENT',
      local_metadata: { elastic: { agent: { version: '7.10.0' } } },
      user_provided_metadata: {},
      current_error_events: [],
      packages: [],
      enrolled_at: '2020-03-14T19:45:02.620Z',
    };
    const mockPolicyAction: AgentPolicyAction = {
      id: 'action1',
      type: 'POLICY_CHANGE',
      policy_id: 'policy1',
      policy_revision: 1,
      sent_at: '2020-03-14T19:45:02.620Z',
      created_at: '2020-03-14T19:45:02.620Z',
      data: {
        policy: {
          id: 'policy1',
          outputs: {
            default: {
              type: OutputType.Elasticsearch,
              hosts: [],
              ca_sha256: undefined,
              api_key: undefined,
            },
          },
          inputs: [],
        },
      },
    };

    it('should return POLICY_CHANGE and data.policy for agent version >= 7.10', async () => {
      const expectedResult = [
        {
          agent_id: 'agent1',
          created_at: '2020-03-14T19:45:02.620Z',
          data: {
            policy: {
              id: 'policy1',
              inputs: [],
              outputs: { default: { api_key: 'MOCK_API_KEY', hosts: [], type: 'elasticsearch' } },
            },
          },
          id: 'action1',
          sent_at: '2020-03-14T19:45:02.620Z',
          type: 'POLICY_CHANGE',
        },
      ];

      expect(
        await createAgentActionFromPolicyAction(mockSavedObjectsClient, mockAgent, mockPolicyAction)
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '7.10.0-SNAPSHOT' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '7.10.2' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '8.0.0' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '8.0.0-SNAPSHOT' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);
    });

    it('should return CONNFIG_CHANGE and data.config for agent version <= 7.9', async () => {
      const expectedResult = [
        {
          agent_id: 'agent1',
          created_at: '2020-03-14T19:45:02.620Z',
          data: {
            config: {
              id: 'policy1',
              inputs: [],
              outputs: { default: { api_key: 'MOCK_API_KEY', hosts: [], type: 'elasticsearch' } },
            },
          },
          id: 'action1',
          sent_at: '2020-03-14T19:45:02.620Z',
          type: 'CONFIG_CHANGE',
        },
      ];

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '7.9.0' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '7.9.3' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '7.9.1-SNAPSHOT' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);

      expect(
        await createAgentActionFromPolicyAction(
          mockSavedObjectsClient,
          { ...mockAgent, local_metadata: { elastic: { agent: { version: '7.8.2' } } } },
          mockPolicyAction
        )
      ).toEqual(expectedResult);
    });
  });
});
