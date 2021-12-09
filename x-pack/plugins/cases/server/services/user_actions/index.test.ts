/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging/mocks';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { SavedObject, SavedObjectsFindResponse, SavedObjectsFindResult } from 'kibana/server';
import { ConnectorUserAction } from '../../../common/api/cases/user_actions/connector';
import { CaseUserActionService, transformFindResponseToExternalModel } from '.';
import {
  Actions,
  CaseStatuses,
  CaseUserActionAttributes,
  UserAction,
  UserActionField,
} from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  SECURITY_SOLUTION_OWNER,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common/constants';
import { CASE_REF_NAME, SUB_CASE_REF_NAME } from '../../common/constants';

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

const createConnectorUserAction = (
  subCaseId?: string,
  overrides?: Partial<CaseUserActionAttributes>
): SavedObject<CaseUserActionAttributes> => {
  return {
    ...createUserActionSO({
      action: 'create',
      fields: ['connector'],
      newValue: createConnectorObject(),
      subCaseId,
    }),
    ...(overrides && { ...overrides }),
  };
};

const updateConnectorUserAction = ({
  subCaseId,
  overrides,
  oldValue,
}: {
  subCaseId?: string;
  overrides?: Partial<CaseUserActionAttributes>;
  oldValue?: string | null | Record<string, unknown>;
} = {}): SavedObject<CaseUserActionAttributes> => {
  return {
    ...createUserActionSO({
      action: 'update',
      fields: ['connector'],
      newValue: createJiraConnector(),
      oldValue,
      subCaseId,
    }),
    ...(overrides && { ...overrides }),
  };
};

const pushConnectorUserAction = ({
  subCaseId,
  overrides,
  oldValue,
}: {
  subCaseId?: string;
  overrides?: Partial<CaseUserActionAttributes>;
  oldValue?: string | null | Record<string, unknown>;
} = {}): SavedObject<CaseUserActionAttributes> => {
  return {
    ...createUserActionSO({
      action: Actions.push_to_service,
      fields: ['pushed'],
      newValue: createExternalService(),
      oldValue,
      subCaseId,
    }),
    ...(overrides && { ...overrides }),
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
  fields,
  subCaseId,
  newValue,
  oldValue,
  attributesOverrides,
  commentId,
}: {
  action: UserAction;
  fields: UserActionField;
  subCaseId?: string;
  newValue?: string | null | Record<string, unknown>;
  oldValue?: string | null | Record<string, unknown>;
  attributesOverrides?: Partial<CaseUserActionAttributes>;
  commentId?: string;
}): SavedObject<CaseUserActionAttributes> => {
  const defaultParams = {
    action,
    created_at: 'abc',
    created_by: {
      email: 'a',
      username: 'b',
      full_name: 'abc',
    },
    caseId: '1',
    subCaseId,
    fields,
    payload: { title: 'a new title' },
    owner: 'securitySolution',
    ...(commentId ? { comment_id: commentId } : {}),
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
      ...(subCaseId
        ? [
            {
              type: SUB_CASE_SAVED_OBJECT,
              name: SUB_CASE_REF_NAME,
              id: subCaseId,
            },
          ]
        : []),
    ],
  } as SavedObject<CaseUserActionAttributes>;
};

describe('CaseUserActionService', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date(2021, 12, 10));
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
                "action_at": "abc",
                "action_by": Object {
                  "email": "a",
                  "full_name": "abc",
                  "username": "b",
                },
                "action_field": Array [
                  "connector",
                ],
                "action_id": "100",
                "case_id": "1",
                "comment_id": null,
                "payload.connector.id": "1",
                "new_value": "{\\"connector\\":{\\"name\\":\\".jira\\",\\"type\\":\\".jira\\",\\"fields\\":{\\"issueType\\":\\"bug\\",\\"priority\\":\\"high\\",\\"parent\\":\\"2\\"}}}",
                "old_val_connector_id": null,
                "old_value": null,
                "owner": "securitySolution",
                "sub_case_id": "",
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
          ...createUserActionSO({ action: 'create', fields: ['connector'], commentId: '5' }),
          references: [],
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toBeNull();
      });

      it('sets sub_case_id to an empty string when it cannot find the reference', () => {
        const userAction = {
          ...createUserActionSO({ action: 'create', fields: ['connector'], subCaseId: '5' }),
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
          action: 'create',
          fields: ['connector'],
          commentId: '5',
        });

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toEqual('5');
      });

      it('sets sub_case_id correctly when it finds the reference', () => {
        const userAction = {
          ...createUserActionSO({ action: 'create', fields: ['connector'], subCaseId: '5' }),
        };

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.sub_case_id).toEqual('5');
      });

      it('sets action_id correctly to the saved object id', () => {
        const userAction = {
          ...createUserActionSO({ action: 'create', fields: ['connector'], subCaseId: '5' }),
        };

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.action_id).toEqual('100');
      });
    });

    describe('create connector', () => {
      it('does not populate the payload.connector.id when it cannot find the reference', () => {
        const userAction = { ...createConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toBeNull();
      });

      it('does not populate the payload.connector.id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = createConnectorUserAction();
        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toBeNull();
      });

      it('populates the payload.connector.id', () => {
        const userAction = createConnectorUserAction();
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toEqual('1');
      });
    });

    describe('update connector', () => {
      it('does not populate the payload.connector.id when it cannot find the reference', () => {
        const userAction = { ...updateConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toBeNull();
      });

      it('does not populate the payload.connector.id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = updateConnectorUserAction();
        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toBeNull();
      });

      it('populates the payload.connector.id', () => {
        const userAction = updateConnectorUserAction();
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toEqual('1');
      });
    });

    describe('push connector', () => {
      it('does not populate the payload.connector.id when it cannot find the reference', () => {
        const userAction = { ...pushConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toBeNull();
      });

      it('does not populate the payload.connector.id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = pushConnectorUserAction();
        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toBeNull();
      });

      it('populates the payload.connector.id', () => {
        const userAction = pushConnectorUserAction();
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed.saved_objects[0].attributes.payload.connector.id).toEqual('100');
      });
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

    describe('createCaseCreationUserAction', () => {
      it('creates a create case user action', async () => {
        await service.createCaseCreationUserAction({ ...commonArgs, payload: casePayload });
        expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
          'cases-user-actions',
          {
            action: 'create',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            fields: ['description', 'status', 'tags', 'title', 'connector', 'settings', 'owner'],
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
    });

    describe('bulkCreateCaseDeletionUserAction', () => {
      it('creates a delete case user action', async () => {
        await service.bulkCreateCaseDeletionUserAction({
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
              fields: [
                'description',
                'status',
                'tags',
                'title',
                'connector',
                'settings',
                'owner',
                'comment',
              ],
              owner: 'securitySolution',
              payload: null,
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
              fields: [
                'description',
                'status',
                'tags',
                'title',
                'connector',
                'settings',
                'owner',
                'comment',
              ],
              owner: 'securitySolution',
              payload: null,
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

    describe('createStatusUpdateUserAction', () => {
      it('creates an update status user action', async () => {
        await service.createStatusUpdateUserAction({ ...commonArgs, status: CaseStatuses.closed });
        expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
          'cases-user-actions',
          {
            action: 'update',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            fields: ['status'],
            owner: 'securitySolution',
            payload: { status: 'closed' },
          },
          { references: [{ id: '123', name: 'associated-cases', type: 'cases' }] }
        );
      });
    });

    describe('createPushToServiceUserAction', () => {
      it('creates a push user action', async () => {
        await service.createPushToServiceUserAction({ ...commonArgs, externalService });
        expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
          'cases-user-actions',
          {
            action: 'push_to_service',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            fields: ['pushed'],
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

    describe('bulkCreateBulkUpdateCaseUserActions', () => {
      it('creates the correct user actions when bulk updating cases', async () => {
        await service.bulkCreateBulkUpdateCaseUserActions({
          ...commonArgs,
          originalCases,
          updatedCases,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
          {
            attributes: {
              action: 'update',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              fields: ['title'],
              owner: 'securitySolution',
              payload: { title: 'updated title' },
            },
            references: [{ id: '1', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'update',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              fields: ['status'],
              owner: 'securitySolution',
              payload: { status: 'closed' },
            },
            references: [{ id: '1', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'update',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              fields: ['connector'],
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
              action: 'update',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              fields: ['description'],
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
              fields: ['tags'],
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
              fields: ['tags'],
              owner: 'securitySolution',
              payload: { tags: ['defacement'] },
            },
            references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
          {
            attributes: {
              action: 'update',
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              fields: ['settings'],
              owner: 'securitySolution',
              payload: { settings: { syncAlerts: false } },
            },
            references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
            type: 'cases-user-actions',
          },
        ]);
      });
    });

    describe('createAttachmentUserAction', () => {
      type MethodsOfService =
        | 'createAttachmentCreationUserAction'
        | 'createAttachmentDeletionUserAction'
        | 'createAttachmentUpdateUserAction';
      type TestParameters = [MethodsOfService, string];

      it.each<TestParameters>([
        ['createAttachmentCreationUserAction', 'create'],
        ['createAttachmentDeletionUserAction', 'delete'],
        ['createAttachmentUpdateUserAction', 'update'],
      ])('creates a create case user action', async (func, action) => {
        await service[func]({
          ...commonArgs,
          attachmentId: 'test-id',
          attachment: comment,
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
            fields: ['comment'],
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
      });
    });

    describe('bulkCreateAttachmentDeletionUserAction', () => {
      it('creates delete comment user action', async () => {
        await service.bulkCreateAttachmentDeletionUserAction({
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
              fields: ['comment'],
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
              fields: ['comment'],
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
  });
});
