/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsFindResponse, SavedObjectsFindResult } from 'kibana/server';
import { ConnectorUserAction } from '../../../common/api/cases/user_actions/connector';
import { transformFindResponseToExternalModel } from '.';
import {
  Actions,
  CaseUserActionAttributes,
  UserAction,
  UserActionField,
} from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common/constants';
import { CASE_REF_NAME, SUB_CASE_REF_NAME } from '../../common/constants';

import {
  createConnectorObject,
  createExternalService,
  createJiraConnector,
  createSOFindResponse,
} from '../test_utils';

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
});
