/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsFindResult } from 'kibana/server';
import { transformFindResponseToExternalModel, UserActionItem } from '.';
import { CaseUserActionAttributes, UserAction, UserActionField } from '../../../common/api';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';

import {
  createConnectorObject,
  createExternalService,
  createJiraConnector,
  createSOFindResponse,
} from '../test_utils';
import { buildCaseUserActionItem, buildCommentUserActionItem } from './helpers';

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
      action: 'push-to-service',
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
    actionAt: 'abc',
    actionBy: {
      email: 'a',
      username: 'b',
      full_name: 'abc',
    },
    caseId: '1',
    subCaseId,
    fields,
    newValue,
    oldValue,
    owner: 'securitySolution',
  };

  let userAction: UserActionItem;

  if (commentId) {
    userAction = buildCommentUserActionItem({
      commentId,
      ...defaultParams,
    });
  } else {
    userAction = buildCaseUserActionItem(defaultParams);
  }

  return {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: '100',
    attributes: {
      ...userAction.attributes,
      ...(attributesOverrides && { ...attributesOverrides }),
    },
    references: userAction.references,
  };
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
                "new_val_connector_id": "1",
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

    it('populates the new_val_connector_id for multiple user actions', () => {
      const transformed = transformFindResponseToExternalModel(
        createSOFindResponse([
          createUserActionFindSO(createConnectorUserAction()),
          createUserActionFindSO(createConnectorUserAction()),
        ])
      );

      expect(transformed.saved_objects[0].attributes.new_val_connector_id).toEqual('1');
      expect(transformed.saved_objects[1].attributes.new_val_connector_id).toEqual('1');
    });

    it('populates the old_val_connector_id for multiple user actions', () => {
      const transformed = transformFindResponseToExternalModel(
        createSOFindResponse([
          createUserActionFindSO(
            createUserActionSO({
              action: 'create',
              fields: ['connector'],
              oldValue: createConnectorObject(),
            })
          ),
          createUserActionFindSO(
            createUserActionSO({
              action: 'create',
              fields: ['connector'],
              oldValue: createConnectorObject({ id: '10' }),
            })
          ),
        ])
      );

      expect(transformed.saved_objects[0].attributes.old_val_connector_id).toEqual('1');
      expect(transformed.saved_objects[1].attributes.old_val_connector_id).toEqual('10');
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
      it('does not populate the new_val_connector_id when it cannot find the reference', () => {
        const userAction = { ...createConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toBeNull();
      });

      it('does not populate the old_val_connector_id when it cannot find the reference', () => {
        const userAction = { ...createConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toBeNull();
      });

      it('does not populate the new_val_connector_id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = createConnectorUserAction();
        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toBeNull();
      });

      it('does not populate the old_val_connector_id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = createUserActionSO({
          action: 'create',
          fields: ['connector'],
          oldValue: createConnectorObject(),
        });

        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toBeNull();
      });

      it('populates the new_val_connector_id', () => {
        const userAction = createConnectorUserAction();
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toEqual('1');
      });

      it('populates the old_val_connector_id', () => {
        const userAction = createUserActionSO({
          action: 'create',
          fields: ['connector'],
          oldValue: createConnectorObject(),
        });

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toEqual('1');
      });
    });

    describe('update connector', () => {
      it('does not populate the new_val_connector_id when it cannot find the reference', () => {
        const userAction = { ...updateConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toBeNull();
      });

      it('does not populate the old_val_connector_id when it cannot find the reference', () => {
        const userAction = {
          ...updateConnectorUserAction({ oldValue: createJiraConnector() }),
          references: [],
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toBeNull();
      });

      it('does not populate the new_val_connector_id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = updateConnectorUserAction();
        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toBeNull();
      });

      it('does not populate the old_val_connector_id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = updateConnectorUserAction({ oldValue: createJiraConnector() });

        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toBeNull();
      });

      it('populates the new_val_connector_id', () => {
        const userAction = updateConnectorUserAction();
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toEqual('1');
      });

      it('populates the old_val_connector_id', () => {
        const userAction = updateConnectorUserAction({ oldValue: createJiraConnector() });

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toEqual('1');
      });
    });

    describe('push connector', () => {
      it('does not populate the new_val_connector_id when it cannot find the reference', () => {
        const userAction = { ...pushConnectorUserAction(), references: [] };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toBeNull();
      });

      it('does not populate the old_val_connector_id when it cannot find the reference', () => {
        const userAction = {
          ...pushConnectorUserAction({ oldValue: createExternalService() }),
          references: [],
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toBeNull();
      });

      it('does not populate the new_val_connector_id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = pushConnectorUserAction();
        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toBeNull();
      });

      it('does not populate the old_val_connector_id when the reference exists but the action and fields are invalid', () => {
        const validUserAction = pushConnectorUserAction({ oldValue: createExternalService() });

        const invalidUserAction = {
          ...validUserAction,
          attributes: { ...validUserAction.attributes, action: 'invalid' },
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([
            createUserActionFindSO(invalidUserAction as SavedObject<CaseUserActionAttributes>),
          ])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toBeNull();
      });

      it('populates the new_val_connector_id', () => {
        const userAction = pushConnectorUserAction();
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.new_val_connector_id).toEqual('100');
      });

      it('populates the old_val_connector_id', () => {
        const userAction = pushConnectorUserAction({ oldValue: createExternalService() });

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)])
        );

        expect(transformed.saved_objects[0].attributes.old_val_connector_id).toEqual('100');
      });
    });
  });
});
