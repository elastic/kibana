/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAgentAction } from './actions';
import { SavedObject } from 'kibana/server';
import { AgentAction } from '../../../common/types/models';
import { savedObjectsClientMock } from 'src/core/server/mocks';

describe('test agent actions services', () => {
  it('should create a new action', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    const newAgentAction: Omit<AgentAction, 'id'> = {
      agent_id: 'agentid',
      type: 'POLICY_CHANGE',
      data: { content: 'data' },
      sent_at: '2020-03-14T19:45:02.620Z',
      created_at: '2020-03-14T19:45:02.620Z',
    };
    mockSavedObjectsClient.create.mockReturnValue(
      Promise.resolve({
        attributes: {
          agent_id: 'agentid',
          type: 'POLICY_CHANGE',
          data: JSON.stringify({ content: 'data' }),
          sent_at: '2020-03-14T19:45:02.620Z',
          created_at: '2020-03-14T19:45:02.620Z',
        },
      } as SavedObject)
    );
    await createAgentAction(mockSavedObjectsClient, newAgentAction);

    const createdAction = (mockSavedObjectsClient.create.mock
      .calls[0][1] as unknown) as AgentAction;
    expect(createdAction).toBeDefined();
    expect(createdAction?.type).toEqual(newAgentAction.type);
    expect(createdAction?.data).toEqual(JSON.stringify(newAgentAction.data));
    expect(createdAction?.sent_at).toEqual(newAgentAction.sent_at);
  });
});
