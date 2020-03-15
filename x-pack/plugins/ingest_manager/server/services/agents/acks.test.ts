/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { savedObjectsClientMock } from '../../../../../../src/core/server/saved_objects/service/saved_objects_client.mock';
import { Agent, AgentAction, AgentEvent } from '../../../common/types/models';
import { AGENT_TYPE_PERMANENT } from '../../../common/constants';
import { acknowledgeAgentActions } from './acks';
import { isBoom } from 'boom';

describe('test agent acks services', () => {
  it('should succeed on valid and matched actions', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const agentActions = await acknowledgeAgentActions(
      mockSavedObjectsClient,
      ({
        id: 'id',
        type: AGENT_TYPE_PERMANENT,
        actions: [
          {
            type: 'CONFIG_CHANGE',
            id: 'action1',
            sent_at: '2020-03-14T19:45:02.620Z',
            timestamp: '2019-01-04T14:32:03.36764-05:00',
            created_at: '2020-03-14T19:45:02.620Z',
          },
        ],
      } as unknown) as Agent,
      [
        {
          type: 'ACTION_RESULT',
          subtype: 'CONFIG',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          action_id: 'action1',
          agent_id: 'id',
        } as AgentEvent,
      ]
    );
    expect(agentActions).toEqual([
      ({
        type: 'CONFIG_CHANGE',
        id: 'action1',
        sent_at: '2020-03-14T19:45:02.620Z',
        timestamp: '2019-01-04T14:32:03.36764-05:00',
        created_at: '2020-03-14T19:45:02.620Z',
      } as unknown) as AgentAction,
    ]);
  });

  it('should fail for actions that cannot be found on agent actions list', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    try {
      await acknowledgeAgentActions(
        mockSavedObjectsClient,
        ({
          id: 'id',
          type: AGENT_TYPE_PERMANENT,
          actions: [
            {
              type: 'CONFIG_CHANGE',
              id: 'action1',
              sent_at: '2020-03-14T19:45:02.620Z',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              created_at: '2020-03-14T19:45:02.620Z',
            },
          ],
        } as unknown) as Agent,
        [
          ({
            type: 'ACTION_RESULT',
            subtype: 'CONFIG',
            timestamp: '2019-01-04T14:32:03.36764-05:00',
            action_id: 'action2',
            agent_id: 'id',
          } as unknown) as AgentEvent,
        ]
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(isBoom(e)).toBeTruthy();
    }
  });
});
