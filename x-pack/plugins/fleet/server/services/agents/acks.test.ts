/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsBulkResponse } from 'kibana/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import type {
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
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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
      mockElasticsearchClient,
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
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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
      mockElasticsearchClient,
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
    expect(mockSavedObjectsClient.bulkUpdate).not.toBeCalled();
    expect(mockElasticsearchClient.update).toBeCalled();
    expect(mockElasticsearchClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "packages": Array [
                "system",
              ],
              "policy_revision_idx": 4,
            },
          },
          "id": "id",
          "index": ".fleet-agents",
          "refresh": "wait_for",
        },
      ]
    `);
  });

  it('should update config field on the agent if a policy change is acknowledged with a higher revision than the agent one', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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
      mockElasticsearchClient,
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
    expect(mockSavedObjectsClient.bulkUpdate).not.toBeCalled();
    expect(mockElasticsearchClient.update).toBeCalled();
    expect(mockElasticsearchClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "body": Object {
            "doc": Object {
              "packages": Array [
                "system",
              ],
              "policy_revision_idx": 4,
            },
          },
          "id": "id",
          "index": ".fleet-agents",
          "refresh": "wait_for",
        },
      ]
    `);
  });

  it('should not update config field on the agent if a policy change is acknowledged with a lower revision than the agent one', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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
      mockElasticsearchClient,
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
    expect(mockSavedObjectsClient.bulkUpdate).not.toBeCalled();
    expect(mockSavedObjectsClient.update).not.toBeCalled();
  });

  it('should not update config field on the agent if a policy change for an old revision is acknowledged', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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
      mockElasticsearchClient,
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
    expect(mockSavedObjectsClient.bulkUpdate).not.toBeCalled();
    expect(mockSavedObjectsClient.update).not.toBeCalled();
  });

  it('should fail for actions that cannot be found on agent actions list', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
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
        mockElasticsearchClient,
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
    const mockElasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

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
        mockElasticsearchClient,
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
