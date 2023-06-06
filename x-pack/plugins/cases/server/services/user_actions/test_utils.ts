/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type {
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import { omit, get } from 'lodash';
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import type {
  CaseUserActionAttributesWithoutConnectorId,
  ConnectorUserAction,
  ActionCategory,
} from '../../../common/api';
import { CaseSeverity, CaseStatuses, Actions } from '../../../common/api';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  EXTERNAL_REFERENCE_REF_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import {
  createConnectorObject,
  createExternalService,
  createJiraConnector,
  createSOFindResponse,
} from '../test_utils';
import {
  externalReferenceAttachmentSO,
  persistableStateAttachment,
} from '../../attachment_framework/mocks';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { transformFindResponseToExternalModel } from './transform';

export const createUserActionFindSO = (
  userAction: SavedObject<CaseUserActionAttributesWithoutConnectorId>
): SavedObjectsFindResult<CaseUserActionAttributesWithoutConnectorId> => ({
  ...userAction,
  score: 0,
});

export const createConnectorUserAction = (
  overrides?: Partial<CaseUserActionAttributesWithoutConnectorId>
): SavedObject<CaseUserActionAttributesWithoutConnectorId> => {
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

export const createUserActionSO = ({
  action = Actions.create,
  attributesOverrides,
  commentId,
  connectorId,
  pushedConnectorId,
  payload,
  type,
  references = [],
}: {
  action?: ActionCategory;
  type?: string;
  payload?: Record<string, unknown>;
  attributesOverrides?: Partial<CaseUserActionAttributesWithoutConnectorId>;
  commentId?: string;
  connectorId?: string;
  pushedConnectorId?: string;
  references?: SavedObjectReference[];
} = {}): SavedObject<CaseUserActionAttributesWithoutConnectorId> => {
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
      ...references,
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
  } as SavedObject<CaseUserActionAttributesWithoutConnectorId>;
};

export const updateConnectorUserAction = ({
  overrides,
}: {
  overrides?: Partial<CaseUserActionAttributesWithoutConnectorId>;
} = {}): SavedObject<CaseUserActionAttributesWithoutConnectorId> => {
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

export const pushConnectorUserAction = ({
  overrides,
}: {
  overrides?: Partial<CaseUserActionAttributesWithoutConnectorId>;
} = {}): SavedObject<CaseUserActionAttributesWithoutConnectorId> => {
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

export const createCaseUserAction = (): SavedObject<CaseUserActionAttributesWithoutConnectorId> => {
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
        severity: CaseSeverity.LOW,
        tags: [],
        owner: SECURITY_SOLUTION_OWNER,
      },
      connectorId: id,
      type: 'create_case',
    }),
  };
};

export const createPersistableStateUserAction = () => {
  return {
    ...createUserActionSO({
      action: Actions.create,
      commentId: 'persistable-state-test-id',
      payload: {
        comment: {
          ...persistableStateAttachment,
          persistableStateAttachmentState: { foo: 'foo' },
        },
      },
      type: 'comment',
      references: [{ id: 'testRef', name: 'myTestReference', type: 'test-so' }],
    }),
  };
};

export const createExternalReferenceUserAction = () => {
  return {
    ...createUserActionSO({
      action: Actions.create,
      commentId: 'external-reference-test-id',
      payload: {
        comment: omit(externalReferenceAttachmentSO, 'externalReferenceId'),
      },
      type: 'comment',
      references: [{ id: 'my-id', name: EXTERNAL_REFERENCE_REF_NAME, type: 'test-so' }],
    }),
  };
};

export const testConnectorId = (
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry,
  userAction: SavedObject<CaseUserActionAttributesWithoutConnectorId>,
  path: string,
  expectedConnectorId = '1'
) => {
  it('does set payload.connector.id to none when it cannot find the reference', () => {
    const userActionWithEmptyRef = { ...userAction, references: [] };
    const transformed = transformFindResponseToExternalModel(
      createSOFindResponse([createUserActionFindSO(userActionWithEmptyRef)]),
      persistableStateAttachmentTypeRegistry
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
        createUserActionFindSO(
          invalidUserAction as SavedObject<CaseUserActionAttributesWithoutConnectorId>
        ),
      ]),
      persistableStateAttachmentTypeRegistry
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
        createUserActionFindSO(
          invalidUserAction as SavedObject<CaseUserActionAttributesWithoutConnectorId>
        ),
      ]),
      persistableStateAttachmentTypeRegistry
    ) as SavedObjectsFindResponse<ConnectorUserAction>;

    expect(get(transformed.saved_objects[0].attributes.payload, path)).toBeUndefined();
  });

  it('populates the payload.connector.id', () => {
    const transformed = transformFindResponseToExternalModel(
      createSOFindResponse([createUserActionFindSO(userAction)]),
      persistableStateAttachmentTypeRegistry
    ) as SavedObjectsFindResponse<ConnectorUserAction>;

    expect(get(transformed.saved_objects[0].attributes.payload, path)).toEqual(expectedConnectorId);
  });
};
