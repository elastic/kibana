/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAgentAction, updateAgentActions } from './actions';
import { Agent, AgentAction, NewAgentAction } from '../../../common/types/models';
import { savedObjectsClientMock } from '../../../../../../src/core/server/saved_objects/service/saved_objects_client.mock';
import { AGENT_TYPE_PERMANENT } from '../../../common/constants';

interface UpdatedActions {
  actions: AgentAction[];
}

describe('test agent actions services', () => {
  it('should update agent current actions with new action', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    const newAgentAction: NewAgentAction = {
      type: 'CONFIG_CHANGE',
      data: 'data',
      sent_at: '2020-03-14T19:45:02.620Z',
    };

    await updateAgentActions(
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
      newAgentAction
    );

    const updatedAgentActions = (mockSavedObjectsClient.update.mock
      .calls[0][2] as unknown) as UpdatedActions;

    expect(updatedAgentActions.actions.length).toEqual(2);
    const actualAgentAction = updatedAgentActions.actions.find(action => action?.data === 'data');
    expect(actualAgentAction?.type).toEqual(newAgentAction.type);
    expect(actualAgentAction?.data).toEqual(newAgentAction.data);
    expect(actualAgentAction?.sent_at).toEqual(newAgentAction.sent_at);
  });

  it('should create agent action from new agent action model', async () => {
    const newAgentAction: NewAgentAction = {
      type: 'CONFIG_CHANGE',
      data: 'data',
      sent_at: '2020-03-14T19:45:02.620Z',
    };
    const now = new Date();
    const agentAction = createAgentAction(now, newAgentAction);

    expect(agentAction.type).toEqual(newAgentAction.type);
    expect(agentAction.data).toEqual(newAgentAction.data);
    expect(agentAction.sent_at).toEqual(newAgentAction.sent_at);
  });
});
