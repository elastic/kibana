/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { SavedObjectsBulkResponse } from 'kibana/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../../../../plugins/encrypted_saved_objects/server/mocks';

import {
  Agent,
  AgentAction,
  AgentActionSOAttributes,
  AgentEvent,
} from '../../../common/types/models';
import { AGENT_TYPE_PERMANENT, AGENT_ACTION_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { acknowledgeAgentActions } from './acks';
import { appContextService } from '../app_context';
import { IngestManagerAppContext } from '../../plugin';

describe('test agent acks services', () => {
  it('should succeed on valid and matched actions', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockStartEncryptedSOPlugin = encryptedSavedObjectsMock.createStart();
    appContextService.start(({
      encryptedSavedObjectsStart: mockStartEncryptedSOPlugin,
    } as unknown) as IngestManagerAppContext);

    const [
      { value: mockStartEncryptedSOClient },
    ] = mockStartEncryptedSOPlugin.getClient.mock.results;

    mockStartEncryptedSOClient.getDecryptedAsInternalUser.mockReturnValue(
      Promise.resolve({
        id: 'action1',
        references: [],
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
        attributes: {
          type: 'CONFIG_CHANGE',
          agent_id: 'id',
          sent_at: '2020-03-14T19:45:02.620Z',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          created_at: '2020-03-14T19:45:02.620Z',
        },
      })
    );

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action1',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'CONFIG_CHANGE',
              agent_id: 'id',
              sent_at: '2020-03-14T19:45:02.620Z',
              timestamp: '2019-01-04T14:32:03.36764-05:00',
              created_at: '2020-03-14T19:45:02.620Z',
            },
          },
        ],
      } as SavedObjectsBulkResponse<AgentActionSOAttributes>)
    );

    const agentActions = await acknowledgeAgentActions(
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
    expect(agentActions).toEqual([
      ({
        type: 'CONFIG_CHANGE',
        id: 'action1',
        agent_id: 'id',
        sent_at: '2020-03-14T19:45:02.620Z',
        timestamp: '2019-01-04T14:32:03.36764-05:00',
        created_at: '2020-03-14T19:45:02.620Z',
      } as unknown) as AgentAction,
    ]);
  });

  it('should update config field on the agent if a policy change is acknowledged', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockStartEncryptedSOPlugin = encryptedSavedObjectsMock.createStart();
    appContextService.start(({
      encryptedSavedObjectsStart: mockStartEncryptedSOPlugin,
    } as unknown) as IngestManagerAppContext);

    const [
      { value: mockStartEncryptedSOClient },
    ] = mockStartEncryptedSOPlugin.getClient.mock.results;

    mockStartEncryptedSOClient.getDecryptedAsInternalUser.mockReturnValue(
      Promise.resolve({
        id: 'action1',
        references: [],
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
        attributes: {
          type: 'CONFIG_CHANGE',
          agent_id: 'id',
          sent_at: '2020-03-14T19:45:02.620Z',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          created_at: '2020-03-14T19:45:02.620Z',
          data: JSON.stringify({
            config: {
              id: 'policy1',
              revision: 4,
              settings: {
                monitoring: {
                  enabled: true,
                  use_output: 'default',
                  logs: true,
                  metrics: true,
                },
              },
              outputs: {
                default: {
                  type: 'elasticsearch',
                  hosts: ['http://localhost:9200'],
                },
              },
              inputs: [
                {
                  id: 'f2293360-b57c-11ea-8bd3-7bd51e425399',
                  name: 'system-1',
                  type: 'logs',
                  use_output: 'default',
                  meta: {
                    package: {
                      name: 'system',
                      version: '0.3.0',
                    },
                  },
                  dataset: {
                    namespace: 'default',
                  },
                  streams: [
                    {
                      id: 'logs-system.syslog',
                      dataset: {
                        name: 'system.syslog',
                      },
                      paths: ['/var/log/messages*', '/var/log/syslog*'],
                      exclude_files: ['.gz$'],
                      multiline: {
                        pattern: '^\\s',
                        match: 'after',
                      },
                      processors: [
                        {
                          add_locale: null,
                        },
                        {
                          add_fields: {
                            target: '',
                            fields: {
                              'ecs.version': '1.5.0',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        },
      })
    );

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action1',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'CONFIG_CHANGE',
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
        policy_id: 'policy1',
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
    expect(mockSavedObjectsClient.bulkUpdate).toBeCalled();
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toHaveLength(2);
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

  it('should not update config field on the agent if a policy change for an old revision is acknowledged', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    const mockStartEncryptedSOPlugin = encryptedSavedObjectsMock.createStart();
    appContextService.start(({
      encryptedSavedObjectsStart: mockStartEncryptedSOPlugin,
    } as unknown) as IngestManagerAppContext);

    const [
      { value: mockStartEncryptedSOClient },
    ] = mockStartEncryptedSOPlugin.getClient.mock.results;

    mockStartEncryptedSOClient.getDecryptedAsInternalUser.mockReturnValue(
      Promise.resolve({
        id: 'action1',
        references: [],
        type: AGENT_ACTION_SAVED_OBJECT_TYPE,
        attributes: {
          type: 'CONFIG_CHANGE',
          agent_id: 'id',
          sent_at: '2020-03-14T19:45:02.620Z',
          timestamp: '2019-01-04T14:32:03.36764-05:00',
          created_at: '2020-03-14T19:45:02.620Z',
          data: JSON.stringify({
            config: {
              id: 'policy1',
              revision: 4,
              settings: {
                monitoring: {
                  enabled: true,
                  use_output: 'default',
                  logs: true,
                  metrics: true,
                },
              },
              outputs: {
                default: {
                  type: 'elasticsearch',
                  hosts: ['http://localhost:9200'],
                },
              },
              inputs: [
                {
                  id: 'f2293360-b57c-11ea-8bd3-7bd51e425399',
                  name: 'system-1',
                  type: 'logs',
                  use_output: 'default',
                  meta: {
                    package: {
                      name: 'system',
                      version: '0.3.0',
                    },
                  },
                  dataset: {
                    namespace: 'default',
                  },
                  streams: [
                    {
                      id: 'logs-system.syslog',
                      dataset: {
                        name: 'system.syslog',
                      },
                      paths: ['/var/log/messages*', '/var/log/syslog*'],
                      exclude_files: ['.gz$'],
                      multiline: {
                        pattern: '^\\s',
                        match: 'after',
                      },
                      processors: [
                        {
                          add_locale: null,
                        },
                        {
                          add_fields: {
                            target: '',
                            fields: {
                              'ecs.version': '1.5.0',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        },
      })
    );

    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action1',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'CONFIG_CHANGE',
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
        policy_id: 'policy1',
        policy_revision: 100,
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
    expect(mockSavedObjectsClient.bulkUpdate).toBeCalled();
    expect(mockSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toHaveLength(1);
  });

  it('should fail for actions that cannot be found on agent actions list', async () => {
    const mockSavedObjectsClient = savedObjectsClientMock.create();
    mockSavedObjectsClient.bulkGet.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            id: 'action1',
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
            action_id: 'action2',
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
            id: 'action1',
            references: [],
            type: AGENT_ACTION_SAVED_OBJECT_TYPE,
            attributes: {
              type: 'CONFIG_CHANGE',
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
            action_id: 'action1',
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
