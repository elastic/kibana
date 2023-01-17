/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformFindResponseToExternalModel } from './transform';
import { createSOFindResponse } from '../test_utils';
import {
  createUserActionFindSO,
  createConnectorUserAction,
  createUserActionSO,
  updateConnectorUserAction,
  pushConnectorUserAction,
  createCaseUserAction,
  createPersistableStateUserAction,
  createExternalReferenceUserAction,
  testConnectorId,
} from './test_utils';
import { createPersistableStateAttachmentTypeRegistryMock } from '../../attachment_framework/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { ConnectorUserAction } from '../../../common/api';
import { Actions } from '../../../common/api';

describe('transform', () => {
  describe('transformFindResponseToExternalModel', () => {
    const persistableStateAttachmentTypeRegistry =
      createPersistableStateAttachmentTypeRegistryMock();

    it('does not populate the ids when the response is an empty array', () => {
      expect(
        transformFindResponseToExternalModel(
          createSOFindResponse([]),
          persistableStateAttachmentTypeRegistry
        )
      ).toMatchInlineSnapshot(`
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
        createSOFindResponse([createUserActionFindSO(createConnectorUserAction())]),
        persistableStateAttachmentTypeRegistry
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
        ]),
        persistableStateAttachmentTypeRegistry
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
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.case_id).toEqual('');
      });

      it('sets comment_id to null when it cannot find the reference', () => {
        const userAction = {
          ...createUserActionSO({ action: Actions.create, commentId: '5' }),
          references: [],
        };
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toBeNull();
      });

      it('sets case_id correctly when it finds the reference', () => {
        const userAction = createConnectorUserAction();

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.case_id).toEqual('1');
      });

      it('sets comment_id correctly when it finds the reference', () => {
        const userAction = createUserActionSO({
          action: Actions.create,
          commentId: '5',
        });

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toEqual('5');
      });

      it('sets action_id correctly to the saved object id', () => {
        const userAction = {
          ...createUserActionSO({ action: Actions.create, commentId: '5' }),
        };

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.action_id).toEqual('100');
      });
    });

    describe('create connector', () => {
      const userAction = createConnectorUserAction();
      testConnectorId(persistableStateAttachmentTypeRegistry, userAction, 'connector.id');
    });

    describe('update connector', () => {
      const userAction = updateConnectorUserAction();
      testConnectorId(persistableStateAttachmentTypeRegistry, userAction, 'connector.id');
    });

    describe('push connector', () => {
      const userAction = pushConnectorUserAction();
      testConnectorId(
        persistableStateAttachmentTypeRegistry,
        userAction,
        'externalService.connector_id',
        '100'
      );
    });

    describe('create case', () => {
      const userAction = createCaseUserAction();
      testConnectorId(persistableStateAttachmentTypeRegistry, userAction, 'connector.id');
    });

    describe('persistable state attachments', () => {
      it('populates the persistable state', () => {
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(createPersistableStateUserAction())]),
          persistableStateAttachmentTypeRegistry
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

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
                  "comment_id": "persistable-state-test-id",
                  "created_at": "abc",
                  "created_by": Object {
                    "email": "a",
                    "full_name": "abc",
                    "username": "b",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "comment": Object {
                      "owner": "securitySolutionFixture",
                      "persistableStateAttachmentState": Object {
                        "foo": "foo",
                        "injectedId": "testRef",
                      },
                      "persistableStateAttachmentTypeId": ".test",
                      "type": "persistableState",
                    },
                  },
                  "type": "comment",
                },
                "id": "100",
                "references": Array [
                  Object {
                    "id": "testRef",
                    "name": "myTestReference",
                    "type": "test-so",
                  },
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                  Object {
                    "id": "persistable-state-test-id",
                    "name": "associated-cases-comments",
                    "type": "cases-comments",
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
    });

    describe('external references', () => {
      it('populates the external references attributes', () => {
        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(createExternalReferenceUserAction())]),
          persistableStateAttachmentTypeRegistry
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

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
                  "comment_id": "external-reference-test-id",
                  "created_at": "abc",
                  "created_by": Object {
                    "email": "a",
                    "full_name": "abc",
                    "username": "b",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "comment": Object {
                      "externalReferenceAttachmentTypeId": ".test",
                      "externalReferenceId": "my-id",
                      "externalReferenceMetadata": null,
                      "externalReferenceStorage": Object {
                        "soType": "test-so",
                        "type": "savedObject",
                      },
                      "owner": "securitySolution",
                      "type": "externalReference",
                    },
                  },
                  "type": "comment",
                },
                "id": "100",
                "references": Array [
                  Object {
                    "id": "my-id",
                    "name": "externalReferenceId",
                    "type": "test-so",
                  },
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                  Object {
                    "id": "external-reference-test-id",
                    "name": "associated-cases-comments",
                    "type": "cases-comments",
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
    });
  });
});
