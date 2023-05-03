/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';

import { isCommentRequestTypePersistableState } from '../../../common/utils/attachments';
import {
  isConnectorUserAction,
  isPushedUserAction,
  isCreateCaseUserAction,
  isCommentUserAction,
} from '../../../common/utils/user_actions';
import type { CaseUserActionDeprecatedResponse, UserActionAttributes } from '../../../common/api';
import { NONE_CONNECTOR_ID } from '../../../common/api';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import {
  CASE_REF_NAME,
  COMMENT_REF_NAME,
  CONNECTOR_ID_REFERENCE_NAME,
  EXTERNAL_REFERENCE_REF_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../common/constants';
import { findConnectorIdReference } from '../transform';
import { isCommentRequestTypeExternalReferenceSO } from '../type_guards';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { injectPersistableReferencesToSO } from '../../attachment_framework/so_references';
import { findReferenceId } from '../../common/references';
import type {
  UserActionPersistedAttributes,
  UserActionSavedObjectTransformed,
  UserActionTransformedAttributes,
} from '../../common/types/user_actions';

export function transformFindResponseToExternalModel(
  userActions: SavedObjectsFindResponse<UserActionPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObjectsFindResponse<UserActionTransformedAttributes> {
  return {
    ...userActions,
    saved_objects: userActions.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so, persistableStateAttachmentTypeRegistry),
    })),
  };
}

export function transformToExternalModel(
  userAction: SavedObject<UserActionPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): UserActionSavedObjectTransformed {
  const { references } = userAction;

  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const payload = addReferenceIdToPayload(userAction, persistableStateAttachmentTypeRegistry);

  return {
    ...userAction,
    attributes: {
      type: userAction.attributes.type,
      action: userAction.attributes.action,
      created_at: userAction.attributes.created_at,
      created_by: userAction.attributes.created_by,
      owner: userAction.attributes.owner,
      comment_id: commentId,
      payload,
    } as UserActionTransformedAttributes,
  };
}

/**
 * This function should only be used in the getAll user actions and it is deprecated. It should be removed when the
 * getAll route is removed.
 *
 * @deprecated remove when the getAllRoute is removed
 */
export function legacyTransformFindResponseToExternalModel(
  userActions: SavedObjectsFindResponse<UserActionPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObjectsFindResponse<CaseUserActionDeprecatedResponse> {
  return {
    ...userActions,
    saved_objects: userActions.saved_objects.map((so) => ({
      ...so,
      ...legacyTransformToExternalModel(so, persistableStateAttachmentTypeRegistry),
    })),
  };
}

/**
 * @deprecated remove when the getAll route is removed
 */
function legacyTransformToExternalModel(
  userAction: SavedObject<UserActionPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObject<CaseUserActionDeprecatedResponse> {
  const { references } = userAction;

  const caseId = findReferenceId(CASE_REF_NAME, CASE_SAVED_OBJECT, references) ?? '';
  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const payload = addReferenceIdToPayload(userAction, persistableStateAttachmentTypeRegistry);

  return {
    ...userAction,
    attributes: {
      type: userAction.attributes.type,
      action: userAction.attributes.action,
      created_at: userAction.attributes.created_at,
      created_by: userAction.attributes.created_by,
      owner: userAction.attributes.owner,
      action_id: userAction.id,
      case_id: caseId,
      comment_id: commentId,
      payload,
    } as CaseUserActionDeprecatedResponse,
  };
}

const addReferenceIdToPayload = (
  userAction: SavedObject<UserActionPersistedAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): UserActionAttributes['payload'] => {
  const connectorId = getConnectorIdFromReferences(userAction);
  const userActionAttributes = userAction.attributes;

  if (isCreateCaseUserAction(userActionAttributes)) {
    return {
      assignees: userActionAttributes.payload.assignees,
      description: userActionAttributes.payload.description,
      owner: userActionAttributes.payload.owner,
      settings: userActionAttributes.payload.settings,
      severity: userActionAttributes.payload.severity,
      status: userActionAttributes.payload.status,
      tags: userActionAttributes.payload.tags,
      title: userActionAttributes.payload.title,
      connector: {
        name: userActionAttributes.payload.connector.name,
        type: userActionAttributes.payload.connector.type,
        fields: userActionAttributes.payload.connector.fields,
        id: connectorId ?? NONE_CONNECTOR_ID,
      },
    };
  } else if (isConnectorUserAction(userActionAttributes)) {
    return {
      connector: {
        name: userActionAttributes.payload.connector.name,
        type: userActionAttributes.payload.connector.type,
        fields: userActionAttributes.payload.connector.fields,
        id: connectorId ?? NONE_CONNECTOR_ID,
      },
    };
  } else if (isPushedUserAction(userActionAttributes)) {
    return {
      externalService: {
        connector_name: userActionAttributes.payload.externalService.connector_name,
        external_id: userActionAttributes.payload.externalService.external_id,
        external_title: userActionAttributes.payload.externalService.external_title,
        external_url: userActionAttributes.payload.externalService.external_url,
        pushed_at: userActionAttributes.payload.externalService.pushed_at,
        pushed_by: userActionAttributes.payload.externalService.pushed_by,
        connector_id: connectorId ?? NONE_CONNECTOR_ID,
      },
    };
  } else if (isCommentUserAction(userActionAttributes)) {
    if (isCommentRequestTypeExternalReferenceSO(userActionAttributes.payload.comment)) {
      const externalReferenceId = findReferenceId(
        EXTERNAL_REFERENCE_REF_NAME,
        userActionAttributes.payload.comment.externalReferenceStorage.soType,
        userAction.references
      );

      return {
        comment: {
          externalReferenceAttachmentTypeId:
            userActionAttributes.payload.comment.externalReferenceAttachmentTypeId,
          externalReferenceMetadata: userActionAttributes.payload.comment.externalReferenceMetadata,
          externalReferenceStorage: userActionAttributes.payload.comment.externalReferenceStorage,
          owner: userActionAttributes.payload.comment.owner,
          type: userActionAttributes.payload.comment.type,
          externalReferenceId: externalReferenceId ?? '',
        },
      };
    }

    if (isCommentRequestTypePersistableState(userActionAttributes.payload.comment)) {
      const injectedAttributes = injectPersistableReferencesToSO(
        userActionAttributes.payload.comment,
        userAction.references,
        {
          persistableStateAttachmentTypeRegistry,
        }
      );

      return {
        comment: {
          persistableStateAttachmentState: injectedAttributes.persistableStateAttachmentState,
          persistableStateAttachmentTypeId: injectedAttributes.persistableStateAttachmentTypeId,
          owner: injectedAttributes.owner,
          type: injectedAttributes.type,
        },
      };
    }
  }

  return userAction.attributes.payload;
};

function getConnectorIdFromReferences(
  userAction: SavedObject<UserActionPersistedAttributes>
): string | null {
  const { references } = userAction;

  if (
    isConnectorUserAction(userAction.attributes) ||
    isCreateCaseUserAction(userAction.attributes)
  ) {
    return findConnectorIdReference(CONNECTOR_ID_REFERENCE_NAME, references)?.id ?? null;
  } else if (isPushedUserAction(userAction.attributes)) {
    return findConnectorIdReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, references)?.id ?? null;
  }

  return null;
}
