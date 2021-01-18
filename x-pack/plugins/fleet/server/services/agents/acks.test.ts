/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from '@hapi/boom';
import { SavedObjectsBulkResponse } from 'kibana/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';

import {
  Agent,
  AgentActionSOAttributes,
  BaseAgentActionSOAttributes,
  AgentEvent,
} from '../../../common/types/models';
import { AGENT_TYPE_PERMANENT, AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { acknowledgeAgentActions } from './acks';

describe('test agent acks services', () => {
  it('should succeed on valid and matched actions', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action1',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'POLICY_CHANGE',
              agent_id: 'id',
              sent_at: '2020-03-14T19:45:02.620Z',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              created_at: '2020-03-14T19:45:02.620Z',
            },
          },
        ],
      } as SavedObjectsBulkResponse<AgentActionSOAttributes>)
    );

    await acknowledgeAgentActions(
      mockSavedObjectsClient,
      ({
        id: 'id',
        type: AGENT_TYPE_PERMANENT,
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
  });

  it('should update config field on the agent if a policy change is acknowledged with an agent without policy', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    const actionAttributes = {
      type: 'POLICY_CHANGE',
      policy_id: 'policy1',
      policy_revision: 4,
      sent_at: '2020-03-14T19:45:02.620Z',
      timestamp: '2019-01-04T14:32:03.36764-05:00',
      created_at: '2020-03-14T19:45:02.620Z',
      ack_data: JSON.stringify({ packages: ['system'] }),
    };

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action2',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: actionAttributes,
          },
        ],
      } as SavedObjectsBulkResponse<BaseAgentActionSOAttributes>)
    );

    await acknowledgeAgentActions(
      mockSavedObjectsClient,
      ({
        id: 'id',
        type: AGENT_TYPE_PERMANENT,
        policy_id: 'policy1',
      } as unknown) as Agent,
      [
        {
          type: 'ACTION_RESULT',
          subtype: 'CONFIG',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          action_id: 'action2',
          agent_id: 'id',
        } as AgentEvent,
      ]
    );
    expect(mockSavedObjectsClient.bulkUpdate).toBeCalled();
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toHaveLength(1);
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0][0]).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "packages": Array [
            "system",
          ],
          "policy_revision": 4,
        },
        "id": "id",
        "type": "fleet-agents",
      }
    `);
  });

  it('should update config field on the agent if a policy change is acknowledged with a higher revision than the agent one', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    const actionAttributes = {
      type: 'POLICY_CHANGE',
      policy_id: 'policy1',
      policy_revision: 4,
      sent_at: '2020-03-14T19:45:02.620Z',
      timestamp: '2019-01-04T14:32:03.36764-05:00',
      created_at: '2020-03-14T19:45:02.620Z',
      ack_data: JSON.stringify({ packages: ['system'] }),
    };

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action2',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: actionAttributes,
          },
        ],
      } as SavedObjectsBulkResponse<BaseAgentActionSOAttributes>)
    );

    await acknowledgeAgentActions(
      mockSavedObjectsClient,
      ({
        id: 'id',
        type: AGENT_TYPE_PERMANENT,
        policy_id: 'policy1',
        policy_revision: 3,
      } as unknown) as Agent,
      [
        {
          type: 'ACTION_RESULT',
          subtype: 'CONFIG',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          action_id: 'action2',
          agent_id: 'id',
        } as AgentEvent,
      ]
    );
    expect(mockSavedObjectsClient.bulkUpdate).toBeCalled();
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toHaveLength(1);
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0][0]).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "packages": Array [
            "system",
          ],
          "policy_revision": 4,
        },
        "id": "id",
        "type": "fleet-agents",
      }
    `);
  });

  it('should not update config field on the agent if a policy change is acknowledged with a lower revision than the agent one', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    const actionAttributes = {
      type: 'POLICY_CHANGE',
      policy_id: 'policy1',
      policy_revision: 4,
      sent_at: '2020-03-14T19:45:02.620Z',
      timestamp: '2019-01-04T14:32:03.36764-05:00',
      created_at: '2020-03-14T19:45:02.620Z',
      ack_data: JSON.stringify({ packages: ['system'] }),
    };

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action2',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: actionAttributes,
          },
        ],
      } as SavedObjectsBulkResponse<BaseAgentActionSOAttributes>)
    );

    await acknowledgeAgentActions(
      mockSavedObjectsClient,
      ({
        id: 'id',
        type: AGENT_TYPE_PERMANENT,
        policy_id: 'policy1',
        policy_revision: 5,
      } as unknown) as Agent,
      [
        {
          type: 'ACTION_RESULT',
          subtype: 'CONFIG',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          action_id: 'action2',
          agent_id: 'id',
        } as AgentEvent,
      ]
    );
    expect(mockSavedObjectsClient.bulkUpdate).toBeCalled();
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toHaveLength(0);
  });

  it('should not update config field on the agent if a policy change for an old revision is acknowledged', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action3',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'POLICY_CHANGE',
              sent_at: '2020-03-14T19:45:02.620Z',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              created_at: '2020-03-14T19:45:02.620Z',
              policy_id: 'policy1',
              policy_revision: 99,
            },
          },
        ],
      } as SavedObjectsBulkResponse<BaseAgentActionSOAttributes>)
    );

    await acknowledgeAgentActions(
      mockSavedObjectsClient,
      ({
        id: 'id',
        type: AGENT_TYPE_PERMANENT,
        policy_id: 'policy1',
        policy_revision: 100,
      } as unknown) as Agent,
      [
        {
          type: 'ACTION_RESULT',
          subtype: 'CONFIG',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          action_id: 'action3',
          agent_id: 'id',
        } as AgentEvent,
      ]
    );
    expect(mockSavedObjectsClient.bulkUpdate).toBeCalled();
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toHaveLength(0);
  });

  it('should fail for actions that cannot be found on agent actions list', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action4',
            error: {
              message: 'Not found',
              statusCode: 404,
            },
          },
        ],
      } as SavedObjectsBulkResponse<AgentActionSOAttributes>)
    );

    try {
      await acknowledgeAgentActions(
        mockSavedObjectsClient,
        ({
          id: 'id',
          type: AGENT_TYPE_PERMANENT,
        } as unknown) as Agent,
        [
          ({
            type: 'ACTION_RESULT',
            subtype: 'CONFIG',
            timestamp: '2019-01-04T14:32:03.36764-05:00',
            action_id: 'action4',
            agent_id: 'id',
          } as unknown) as AgentEvent,
        ]
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(Boom.isBoom(e)).toBeTruthy();
    }
  });

  it('should fail for events that have types not in the allowed acknowledgement type list', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action5',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'POLICY_CHANGE',
              agent_id: 'id',
              sent_at: '2020-03-14T19:45:02.620Z',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              created_at: '2020-03-14T19:45:02.620Z',
            },
          },
        ],
      } as SavedObjectsBulkResponse<AgentActionSOAttributes>)
    );

    try {
      await acknowledgeAgentActions(
        mockSavedObjectsClient,
        ({
          id: 'id',
          type: AGENT_TYPE_PERMANENT,
        } as unknown) as Agent,
        [
          ({
            type: 'ACTION',
            subtype: 'FAILED',
            timestamp: '2019-01-04T14:32:03.36764-05:00',
            action_id: 'action5',
            agent_id: 'id',
          } as unknown) as AgentEvent,
        ]
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(Boom.isBoom(e)).toBeTruthy();
    }
  });
});
