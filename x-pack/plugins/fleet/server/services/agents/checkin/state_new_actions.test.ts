/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { take } from 'rxjs/operators';
import {
  createAgentActionFromPolicyAction,
  createNewActionsSharedObservable,
} from './state_new_actions';
import { getNewActionsSince } from '../actions';
import { Agent, AgentAction, AgentPolicyAction } from '../../../types';
import { outputType } from '../../../../common/constants';

jest.mock('../../app_context', () => ({
  appContextService: {
    getInternalUserSOClient: () => {
      return {};
    },
    getEncryptedSavedObjects: () => ({
      getDecryptedAsInternalUser: () => ({
        attributes: {
          default_api_key: 'MOCK_API_KEY',
        },
      }),
    }),
  },
}));

jest.mock('../actions');

jest.useFakeTimers();

function waitForPromiseResolved() {
  return new Promise((resolve) => setImmediate(resolve));
}

function getMockedNewActionSince() {
  return getNewActionsSince as jest.MockedFunction<typeof getNewActionsSince>;
}

describe('test agent checkin new action services', () => {
  describe('newAgetActionObservable', () => {
    beforeEach(() => {
      (getNewActionsSince as jest.MockedFunction<typeof getNewActionsSince>).mockReset();
    });
    it('should work, call get actions until there is new action', async () => {
      const observable = createNewActionsSharedObservable();

      getMockedNewActionSince()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          ({ id: 'action1', created_at: new Date().toISOString() } as unknown) as AgentAction,
        ])
        .mockResolvedValueOnce([
          ({ id: 'action2', created_at: new Date().toISOString() } as unknown) as AgentAction,
        ]);
      // First call
      const promise = observable.pipe(take(1)).toPromise();

      jest.advanceTimersByTime(5000);
      await waitForPromiseResolved();
      jest.advanceTimersByTime(5000);
      await waitForPromiseResolved();

      const res = await promise;
      expect(getNewActionsSince).toBeCalledTimes(2);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('action1');
      // Second call
      const secondSubscription = observable.pipe(take(1)).toPromise();

      jest.advanceTimersByTime(5000);
      await waitForPromiseResolved();

      const secondRes = await secondSubscription;
      expect(secondRes).toHaveLength(1);
      expect(secondRes[0].id).toBe('action2');
      expect(getNewActionsSince).toBeCalledTimes(3);
      // It should call getNewActionsSince with the last action returned
      expect(getMockedNewActionSince().mock.calls[2][1]).toBe(res[0].created_at);
    });

    it('should not fetch actions concurrently', async () => {
      const observable = createNewActionsSharedObservable();

      const resolves: Array<() => void> = [];
      getMockedNewActionSince().mockImplementation(() => {
        return new Promise((resolve) => {
          resolves.push(resolve);
        });
      });

      observable.pipe(take(1)).toPromise();

      jest.advanceTimersByTime(5000);
      await waitForPromiseResolved();
      jest.advanceTimersByTime(5000);
      await waitForPromiseResolved();
      jest.advanceTimersByTime(5000);
      await waitForPromiseResolved();

      expect(getNewActionsSince).toBeCalledTimes(1);
    });
  });

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
              type: outputType.Elasticsearch,
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
