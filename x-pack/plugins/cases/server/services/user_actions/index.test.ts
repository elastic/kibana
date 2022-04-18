/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObject, SavedObjectsFindResponse, SavedObjectsFindResult } from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import {
  Actions,
  ActionTypes,
  CaseStatuses,
  CaseUserActionAttributes,
  ConnectorUserAction,
  UserAction,
} from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';

import {
  createConnectorObject,
  createExternalService,
  createJiraConnector,
  createSOFindResponse,
} from '../test_utils';
import {
  casePayload,
  externalService,
  originalCases,
  updatedCases,
  comment,
  attachments,
} from './mocks';
import { CaseUserActionService, transformFindResponseToExternalModel } from '.';

const createConnectorUserAction = (
  overrides?: Partial<CaseUserActionAttributes>
): SavedObject<CaseUserActionAttributes> => {
  const { id, ...restConnector } = createConnectorObject().connector;
  return {
    ...createUserActionSO({
      action: Actions.create,
      payload: { connector: restConnector },
      type: 'connector',
      connectorId: id,
    }),
    ...(overrides && { ...overrides }),
  };
};

const updateConnectorUserAction = ({
  overrides,
}: {
  overrides?: Partial<CaseUserActionAttributes>;
} = {}): SavedObject<CaseUserActionAttributes> => {
  const { id, ...restConnector } = createJiraConnector();
  return {
    ...createUserActionSO({
      action: Actions.update,
      payload: { connector: restConnector },
      type: 'connector',
      connectorId: id,
    }),
    ...(overrides && { ...overrides }),
  };
};

const pushConnectorUserAction = ({
  overrides,
}: {
  overrides?: Partial<CaseUserActionAttributes>;
} = {}): SavedObject<CaseUserActionAttributes> => {
  const { connector_id: connectorId, ...restExternalService } = createExternalService();
  return {
    ...createUserActionSO({
      action: Actions.push_to_service,
      payload: { externalService: restExternalService },
      pushedConnectorId: connectorId,
      type: 'pushed',
    }),
    ...(overrides && { ...overrides }),
  };
};

const createCaseUserAction = (): SavedObject<CaseUserActionAttributes> => {
  const { id, ...restConnector } = createJiraConnector();
  return {
    ...createUserActionSO({
      action: Actions.create,
      payload: {
        connector: restConnector,
        title: 'a title',
        description: 'a desc',
        settings: { syncAlerts: false },
        status: CaseStatuses.open,
        tags: [],
        owner: SECURITY_SOLUTION_OWNER,
      },
      connectorId: id,
      type: 'create_case',
    }),
  };
};

const createUserActionFindSO = (
  userAction: SavedObject<CaseUserActionAttributes>
): SavedObjectsFindResult<CaseUserActionAttributes> => ({
  ...userAction,
  score: 0,
});

const createUserActionSO = ({
  action,
  attributesOverrides,
  commentId,
  connectorId,
  pushedConnectorId,
  payload,
  type,
}: {
  action: UserAction;
  type?: string;
  payload?: Record<string, unknown>;
  attributesOverrides?: Partial<CaseUserActionAttributes>;
  commentId?: string;
  connectorId?: string;
  pushedConnectorId?: string;
}): SavedObject<CaseUserActionAttributes> => {
  const defaultParams = {
    action,
    created_at: 'abc',
    created_by: {
      email: 'a',
      username: 'b',
      full_name: 'abc',
    },
    type: type ?? 'title',
    payload: payload ?? { title: 'a new title' },
    owner: 'securitySolution',
  };

  return {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: '100',
    attributes: {
      ...defaultParams,
      ...(attributesOverrides && { ...attributesOverrides }),
    },
    references: [
      {
        type: CASE_SAVED_OBJECT,
        name: CASE_REF_NAME,
        id: '1',
      },
      ...(commentId
        ? [
            {
              type: CASE_COMMENT_SAVED_OBJECT,
              name: COMMENT_REF_NAME,
              id: commentId,
            },
          ]
        : []),
      ...(connectorId
        ? [
            {
              type: ACTION_SAVED_OBJECT_TYPE,
              name: CONNECTOR_ID_REFERENCE_NAME,
              id: connectorId,
            },
          ]
        : []),
      ...(pushedConnectorId
        ? [
            {
              type: ACTION_SAVED_OBJECT_TYPE,
              name: PUSH_CONNECTOR_ID_REFERENCE_NAME,
              id: pushedConnectorId,
            },
          ]
        : []),
    ],
  } as SavedObject<CaseUserActionAttributes>;
};

const testConnectorId = (
  userAction: SavedObject<CaseUserActionAttributes>,
  path: string,
  expectedConnectorId = '1'
) => {
  it('does set payload.connector.id to none when it cannot find the reference', () => {
    const userActionWithEmptyRef = { ...userAction, references: [] };
    const transformed = transformFindResponseToExternalModel(
      createSOFindResponse([createUserActionFindSO(userActionWithEmptyRef)])
    );

    expect(get(transformed.saved_objects[0].attributes.payload, path)).toBe('none');
  });

  it('does not populate the payload.connector.id when the reference exists but the action is not of type connector', () => {
    const invalidUserAction = {
      ...userAction,
      attributes: { ...userAction.attributes, type: 'not-connector' },
    };
    const transformed = transformFindResponseToExternalModel(
      createSOFindResponse([
        createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
      ])
    );

    expect(get(transformed.saved_objects[0].attributes.payload, path)).toBeUndefined();
  });

  it('does not populate the payload.connector.id when the reference exists but the payload does not contain a connector', () => {
    const invalidUserAction = {
      ...userAction,
      attributes: { ...userAction.attributes, payload: {} },
    };
    const transformed = transformFindResponseToExternalModel(
      createSOFindResponse([
        createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
      ])
    ) as SavedObjectsFindResponse<ConnectorUserAction>;

    expect(get(transformed.saved_objects[0].attributes.payload, path)).toBeUndefined();
  });

  it('populates the payload.connector.id', () => {
    const transformed = transformFindResponseToExternalModel(
      createSOFindResponse([createUserActionFindSO(userAction)])
    ) as SavedObjectsFindResponse<ConnectorUserAction>;

    expect(get(transformed.saved_objects[0].attributes.payload, path)).toEqual(expectedConnectorId);
  });
};

describe('CaseUserActionService', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('transformFindResponseToExternalModel', () => {
    it('does not populate the ids when the response is an empty array', () => {
      expect(transformFindResponseToExternalModel(createSOFindResponse([]))).toMatchInlineSnapshot(`
        Object {
          "page": 1,
          "per_page": 0,
          "saved_objects": Array [],
          "total": 0,
        }
      `);
    });

    it('preserves the saved object fields and attributes when inject the ids', () => {
      const transformed = transformFindResponseToExternalModel(
        createSOFindResponse([createUserActionFindSO(createConnectorUserAction())])
      );

      expect(transformed).toMatchInlineSnapshot(`
        Object {
          "page": 1,
          "per_page": 1,
          "saved_objects": Array [
            Object {
              "attributes": Object {
                "action": "create",
                "action_id": "100",
                "case_id": "1",
                "comment_id": null,
                "created_at": "abc",
                "created_by": Object {
                  "email": "a",
                  "full_name": "abc",
                  "username": "b",
                },
                "owner": "securitySolution",
                "payload": Object {
                  "connector": Object {
                    "fields": Object {
                      "issueType": "bug",
                      "parent": "2",
                      "priority": "high",
                    },
                    "id": "1",
                    "name": ".jira",
                    "type": ".jira",
                  },
                },
                "type": "connector",
              },
              "id": "100",
              "references": Array [
                Object {
                  "id": "1",
                  "name": "associated-cases",
                  "type": "cases",
                },
                Object {
                  "id": "1",
                  "name": "connectorId",
                  "type": "action",
                },
              ],
              "score": 0,
              "type": "cases-user-actions",
            },
          ],
          "total": 1,
        }
      `);
    });

    it('populates the payload.connector.id for multiple user actions', () => {
      const transformed = transformFindResponseToExternalModel(
        createSOFindResponse([
          createUserActionFindSO(createConnectorUserAction()),
          createUserActionFindSO(createConnectorUserAction()),
        ])
      ) as SavedObjectsFindResponse<ConnectorUserAction>;

      expect(transformed.saved_objects[0].attributes.payload.connector.id).toEqual('1');
      expect(transformed.saved_objects[1].attributes.payload.connector.id).toEqual('1');
    });

    describe('reference ids', () => {
      it('sets case_id to an empty string when it cannot find the reference', () => {
        const userAction = {
          ...createConnectorUserAction(),
          references: [],
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.case_id).toEqual('');
      });

      it('sets comment_id to null when it cannot find the reference', () => {
        const userAction = {
          ...createUserActionSO({ action: Actions.create, commentId: '5' }),
          references: [],
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toBeNull();
      });

      it('sets case_id correctly when it finds the reference', () => {
        const userAction = createConnectorUserAction();

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.case_id).toEqual('1');
      });

      it('sets comment_id correctly when it finds the reference', () => {
        const userAction = createUserActionSO({
          action: Actions.create,
          commentId: '5',
        });

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toEqual('5');
      });

      it('sets action_id correctly to the saved object id', () => {
        const userAction = {
          ...createUserActionSO({ action: Actions.create, commentId: '5' }),
        };

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.action_id).toEqual('100');
      });
    });

    describe('create connector', () => {
      const userAction = createConnectorUserAction();
      testConnectorId(userAction, 'connector.id');
    });

    describe('update connector', () => {
      const userAction = updateConnectorUserAction();
      testConnectorId(userAction, 'connector.id');
    });

    describe('push connector', () => {
      const userAction = pushConnectorUserAction();
      testConnectorId(userAction, 'externalService.connector_id', '100');
    });

    describe('create case', () => {
      const userAction = createCaseUserAction();
      testConnectorId(userAction, 'connector.id');
    });
  });

  describe('methods', () => {
    let service: CaseUserActionService;
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    const mockLogger = loggerMock.create();
    const commonArgs = {
      unsecuredSavedObjectsClient,
      caseId: '123',
      user: { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' },
      owner: SECURITY_SOLUTION_OWNER,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      service = new CaseUserActionService(mockLogger);
    });

    describe('createUserAction', () => {
      describe('create case', () => {
        it('creates a create case user action', async () => {
          await service.createUserAction({
            ...commonArgs,
            payload: casePayload,
            type: ActionTypes.create_case,
          });
          expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
            'cases-user-actions',
            {
              action: Actions.create,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'create_case',
              owner: 'securitySolution',
              payload: {
                connector: {
                  fields: {
                    category: 'Denial of Service',
                    destIp: true,
                    malwareHash: true,
                    malwareUrl: true,
                    priority: '2',
                    sourceIp: true,
                    subcategory: '45',
                  },
                  name: 'ServiceNow SN',
                  type: '.servicenow-sir',
                },
                description: 'testing sir',
                owner: 'securitySolution',
                settings: { syncAlerts: true },
                status: 'open',
                tags: ['sir'],
                title: 'Case SIR',
              },
            },
            {
              references: [
                { id: '123', name: 'associated-cases', type: 'cases' },
                { id: '456', name: 'connectorId', type: 'action' },
              ],
            }
          );
        });

        describe('status', () => {
          it('creates an update status user action', async () => {
            await service.createUserAction({
              ...commonArgs,
              payload: { status: CaseStatuses.closed },
              type: ActionTypes.status,
            });

            expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
              'cases-user-actions',
              {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'status',
                owner: 'securitySolution',
                payload: { status: 'closed' },
              },
              { references: [{ id: '123', name: 'associated-cases', type: 'cases' }] }
            );
          });
        });

        describe('push', () => {
          it('creates a push user action', async () => {
            await service.createUserAction({
              ...commonArgs,
              payload: { externalService },
              type: ActionTypes.pushed,
            });

            expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
              'cases-user-actions',
              {
                action: Actions.push_to_service,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'pushed',
                owner: 'securitySolution',
                payload: {
                  externalService: {
                    connector_name: 'ServiceNow SN',
                    external_id: 'external-id',
                    external_title: 'SIR0010037',
                    external_url:
                      'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
                    pushed_at: '2021-02-03T17:41:26.108Z',
                    pushed_by: {
                      email: 'elastic@elastic.co',
                      full_name: 'Elastic',
                      username: 'elastic',
                    },
                  },
                },
              },
              {
                references: [
                  { id: '123', name: 'associated-cases', type: 'cases' },
                  { id: '456', name: 'pushConnectorId', type: 'action' },
                ],
              }
            );
          });
        });

        describe('comment', () => {
          it.each([[Actions.create], [Actions.delete], [Actions.update]])(
            'creates a comment user action of action: %s',
            async (action) => {
              await service.createUserAction({
                ...commonArgs,
                type: ActionTypes.comment,
                action,
                attachmentId: 'test-id',
                payload: { attachment: comment },
              });

              expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
                'cases-user-actions',
                {
                  action,
                  created_at: '2022-01-09T22:00:00.000Z',
                  created_by: {
                    email: 'elastic@elastic.co',
                    full_name: 'Elastic User',
                    username: 'elastic',
                  },
                  type: 'comment',
                  owner: 'securitySolution',
                  payload: {
                    comment: {
                      comment: 'a comment',
                      type: 'user',
                      owner: 'securitySolution',
                    },
                  },
                },
                {
                  references: [
                    { id: '123', name: 'associated-cases', type: 'cases' },
                    { id: 'test-id', name: 'associated-cases-comments', type: 'cases-comments' },
                  ],
                }
              );
            }
          );
        });
      });
    });

    describe('bulkCreateCaseDeletion', () => {
      it('creates a delete case user action', async () => {
        await service.bulkCreateCaseDeletion({
          unsecuredSavedObjectsClient,
          cases: [
            { id: '1', owner: SECURITY_SOLUTION_OWNER, connectorId: '3' },
            { id: '2', owner: SECURITY_SOLUTION_OWNER, connectorId: '4' },
          ],
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
          {
            attributes: {
              action: 'delete',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'delete_case',
              owner: 'securitySolution',
              payload: {},
            },
            references: [
              { id: '1', name: 'associated-cases', type: 'cases' },
              { id: '3', name: 'connectorId', type: 'action' },
            ],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'delete',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'delete_case',
              owner: 'securitySolution',
              payload: {},
            },
            references: [
              { id: '2', name: 'associated-cases', type: 'cases' },
              { id: '4', name: 'connectorId', type: 'action' },
            ],
            type: 'cases-user-actions',
          },
        ]);
      });
    });

    describe('bulkCreateUpdateCase', () => {
      it('creates the correct user actions when bulk updating cases', async () => {
        await service.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
          {
            attributes: {
              action: Actions.update,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'title',
              owner: 'securitySolution',
              payload: { title: 'updated title' },
            },
            references: [{ id: '1', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: Actions.update,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'status',
              owner: 'securitySolution',
              payload: { status: 'closed' },
            },
            references: [{ id: '1', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: Actions.update,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'connector',
              owner: 'securitySolution',
              payload: {
                connector: {
                  fields: {
                    category: 'Denial of Service',
                    destIp: true,
                    malwareHash: true,
                    malwareUrl: true,
                    priority: '2',
                    sourceIp: true,
                    subcategory: '45',
                  },
                  name: 'ServiceNow SN',
                  type: '.servicenow-sir',
                },
              },
            },
            references: [
              { id: '1', name: 'associated-cases', type: 'cases' },
              { id: '456', name: 'connectorId', type: 'action' },
            ],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: Actions.update,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'description',
              owner: 'securitySolution',
              payload: { description: 'updated desc' },
            },
            references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'add',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'tags',
              owner: 'securitySolution',
              payload: { tags: ['one', 'two'] },
            },
            references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'delete',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'tags',
              owner: 'securitySolution',
              payload: { tags: ['defacement'] },
            },
            references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: Actions.update,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'settings',
              owner: 'securitySolution',
              payload: { settings: { syncAlerts: false } },
            },
            references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
        ]);
      });
    });

    describe('bulkCreateAttachmentDeletion', () => {
      it('creates delete comment user action', async () => {
        await service.bulkCreateAttachmentDeletion({
          ...commonArgs,
          attachments,
        });
        expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
          {
            attributes: {
              action: 'delete',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'comment',
              owner: 'securitySolution',
              payload: {
                comment: { comment: 'a comment', owner: 'securitySolution', type: 'user' },
              },
            },
            references: [
              { id: '123', name: 'associated-cases', type: 'cases' },
              { id: '1', name: 'associated-cases-comments', type: 'cases-comments' },
            ],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'delete',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'comment',
              owner: 'securitySolution',
              payload: {
                comment: {
                  alertId: 'alert-id-1',
                  index: 'alert-index-1',
                  owner: 'securitySolution',
                  rule: { id: 'rule-id-1', name: 'rule-name-1' },
                  type: 'alert',
                },
              },
            },
            references: [
              { id: '123', name: 'associated-cases', type: 'cases' },
              { id: '2', name: 'associated-cases-comments', type: 'cases-comments' },
            ],
            type: 'cases-user-actions',
          },
        ]);
      });
    });

    describe('create', () => {
      it('creates user actions', async () => {
        await service.create<{ title: string }>({
          unsecuredSavedObjectsClient,
          attributes: { title: 'test' },
          references: [],
        });
        expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
          'cases-user-actions',
          { title: 'test' },
          { references: [] }
        );
      });
    });

    describe('getUniqueConnectors', () => {
      const findResponse = createUserActionFindSO(createConnectorUserAction());
      const aggregationResponse = {
        aggregations: {
          references: {
            doc_count: 8,
            connectors: {
              doc_count: 4,
              ids: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: '865b6040-7533-11ec-8bcc-a9fc6f9d63b2',
                    doc_count: 2,
                    docs: {},
                  },
                  {
                    key: '915c2600-7533-11ec-8bcc-a9fc6f9d63b2',
                    doc_count: 1,
                    docs: {},
                  },
                  {
                    key: 'b2635b10-63e1-11ec-90af-6fe7d490ff66',
                    doc_count: 1,
                    docs: {},
                  },
                ],
              },
            },
          },
        },
      };

      beforeAll(() => {
        unsecuredSavedObjectsClient.find.mockResolvedValue(
          findResponse as unknown as Promise<SavedObjectsFindResponse>
        );
      });

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('it returns an empty array if the response is not valid', async () => {
        const res = await service.getUniqueConnectors({
          unsecuredSavedObjectsClient,
          caseId: '123',
        });

        expect(res).toEqual([]);
      });

      it('it returns the connectors', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValue({
          ...findResponse,
          ...aggregationResponse,
        } as unknown as Promise<SavedObjectsFindResponse>);

        const res = await service.getUniqueConnectors({
          unsecuredSavedObjectsClient,
          caseId: '123',
        });

        expect(res).toEqual([
          { id: '865b6040-7533-11ec-8bcc-a9fc6f9d63b2' },
          { id: '915c2600-7533-11ec-8bcc-a9fc6f9d63b2' },
          { id: 'b2635b10-63e1-11ec-90af-6fe7d490ff66' },
        ]);
      });

      it('it returns the unique connectors', async () => {
        await service.getUniqueConnectors({
          unsecuredSavedObjectsClient,
          caseId: '123',
        });

        expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Object {
              "aggs": Object {
                "references": Object {
                  "aggregations": Object {
                    "connectors": Object {
                      "aggregations": Object {
                        "ids": Object {
                          "terms": Object {
                            "field": "cases-user-actions.references.id",
                            "size": 100,
                          },
                        },
                      },
                      "filter": Object {
                        "term": Object {
                          "cases-user-actions.references.type": "action",
                        },
                      },
                    },
                  },
                  "nested": Object {
                    "path": "cases-user-actions.references",
                  },
                },
              },
              "filter": Object {
                "arguments": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "type": "literal",
                        "value": "cases-user-actions.attributes.type",
                      },
                      Object {
                        "type": "literal",
                        "value": "connector",
                      },
                      Object {
                        "type": "literal",
                        "value": false,
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                  Object {
                    "arguments": Array [
                      Object {
                        "type": "literal",
                        "value": "cases-user-actions.attributes.type",
                      },
                      Object {
                        "type": "literal",
                        "value": "create_case",
                      },
                      Object {
                        "type": "literal",
                        "value": false,
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                ],
                "function": "or",
                "type": "function",
              },
              "hasReference": Object {
                "id": "123",
                "type": "cases",
              },
              "page": 1,
              "perPage": 1,
              "sortField": "created_at",
              "type": "cases-user-actions",
            },
          ]
        `);
      });
    });
  });
});
