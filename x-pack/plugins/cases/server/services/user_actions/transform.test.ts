/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  legacyTransformFindResponseToExternalModel,
  transformFindResponseToExternalModel,
} from './transform';
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
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();

  describe('action_id', () => {
    it('legacyTransformFindResponseToExternalModel sets action_id correctly to the saved object id', () => {
      const userAction = {
        ...createUserActionSO({ action: Actions.create, commentId: '5' }),
      };

      const transformed = legacyTransformFindResponseToExternalModel(
        createSOFindResponse([createUserActionFindSO(userAction)]),
        persistableStateAttachmentTypeRegistry
      );

      expect(transformed.saved_objects[0].attributes.action_id).toEqual('100');
    });

    it('transformFindResponseToExternalModel does not set action_id', () => {
      const userAction = {
        ...createUserActionSO({ action: Actions.create, commentId: '5' }),
      };

      const transformed = transformFindResponseToExternalModel(
        createSOFindResponse([createUserActionFindSO(userAction)]),
        persistableStateAttachmentTypeRegistry
      );

      expect(transformed.saved_objects[0].attributes).not.toHaveProperty('action_id');
    });
  });

  describe('case_id', () => {
    describe('legacyTransformFindResponseToExternalModel', () => {
      it('sets case_id correctly when it finds the reference', () => {
        const userAction = createConnectorUserAction();

        const transformed = legacyTransformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.case_id).toEqual('1');
      });

      it('sets case_id to an empty string when it cannot find the reference', () => {
        const userAction = {
          ...createConnectorUserAction(),
          references: [],
        };
        const transformed = legacyTransformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.case_id).toEqual('');
      });
    });

    describe('transformFindResponseToExternalModel', () => {
      it('does not set the case_id when the reference exists', () => {
        const userAction = createConnectorUserAction();

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes).not.toHaveProperty('case_id');
      });

      it('does not set the case_id when the reference does not exist', () => {
        const userAction = {
          ...createConnectorUserAction(),
          references: [],
        };

        const transformed = transformFindResponseToExternalModel(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes).not.toHaveProperty('case_id');
      });
    });
  });

  describe.each([
    [transformFindResponseToExternalModel.name, transformFindResponseToExternalModel],
    [legacyTransformFindResponseToExternalModel.name, legacyTransformFindResponseToExternalModel],
  ])('%s', (functionName, transformer) => {
    it('does not populate the ids when the response is an empty array', () => {
      expect(transformer(createSOFindResponse([]), persistableStateAttachmentTypeRegistry))
        .toMatchInlineSnapshot(`
        Object {
          "page": 1,
          "per_page": 0,
          "saved_objects": Array [],
          "total": 0,
        }
      `);
    });

    it('preserves the saved object fields and attributes when inject the ids', () => {
      const transformed = transformer(
        createSOFindResponse([createUserActionFindSO(createConnectorUserAction())]),
        persistableStateAttachmentTypeRegistry
      );

      expect(transformed).toMatchSnapshot();
    });

    it('populates the payload.connector.id for multiple user actions', () => {
      const transformed = transformer(
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
      it('sets comment_id to null when it cannot find the reference', () => {
        const userAction = {
          ...createUserActionSO({ action: Actions.create, commentId: '5' }),
          references: [],
        };
        const transformed = transformer(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toBeNull();
      });

      it('sets comment_id correctly when it finds the reference', () => {
        const userAction = createUserActionSO({
          action: Actions.create,
          commentId: '5',
        });

        const transformed = transformer(
          createSOFindResponse([createUserActionFindSO(userAction)]),
          persistableStateAttachmentTypeRegistry
        );

        expect(transformed.saved_objects[0].attributes.comment_id).toEqual('5');
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
        const transformed = transformer(
          createSOFindResponse([createUserActionFindSO(createPersistableStateUserAction())]),
          persistableStateAttachmentTypeRegistry
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed).toMatchSnapshot();
      });
    });

    describe('external references', () => {
      it('populates the external references attributes', () => {
        const transformed = transformer(
          createSOFindResponse([createUserActionFindSO(createExternalReferenceUserAction())]),
          persistableStateAttachmentTypeRegistry
        ) as SavedObjectsFindResponse<ConnectorUserAction>;

        expect(transformed).toMatchSnapshot();
      });
    });
  });
});
