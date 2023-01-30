/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference, SavedObjectsFindResponse } from '@kbn/core/server';

import { isCommentRequestTypePersistableState } from '../../../common/utils/attachments';
import {
  isConnectorUserAction,
  isPushedUserAction,
  isCreateCaseUserAction,
  isCommentUserAction,
} from '../../../common/utils/user_actions';
import type {
  CaseUserActionAttributes,
  CaseUserActionAttributesWithoutConnectorId,
  CaseUserActionDeprecatedResponse,
  CaseUserActionInjectedAttributes,
} from '../../../common/api';
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
import { isCommentRequestTypeExternalReferenceSO } from '../../common/utils';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import { injectPersistableReferencesToSO } from '../../attachment_framework/so_references';

export function transformFindResponseToExternalModel(
  userActions: SavedObjectsFindResponse<CaseUserActionAttributesWithoutConnectorId>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObjectsFindResponse<CaseUserActionInjectedAttributes> {
  return {
    ...userActions,
    saved_objects: userActions.saved_objects.map((so) => ({
      ...so,
      ...transformToExternalModel(so, persistableStateAttachmentTypeRegistry),
    })),
  };
}

export function transformToExternalModel(
  userAction: SavedObject<CaseUserActionAttributesWithoutConnectorId>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): SavedObject<CaseUserActionInjectedAttributes> {
  const { references } = userAction;

  const commentId =
    findReferenceId(COMMENT_REF_NAME, CASE_COMMENT_SAVED_OBJECT, references) ?? null;
  const payload = addReferenceIdToPayload(userAction, persistableStateAttachmentTypeRegistry);

  return {
    ...userAction,
    attributes: {
      ...userAction.attributes,
      comment_id: commentId,
      payload,
    } as CaseUserActionInjectedAttributes,
  };
}

/**
 * This function should only be used in the getAll user actions and it is deprecated. It should be removed when the
 * getAll route is removed.
 *
 * @deprecated remove when the getAllRoute is removed
 */
export function legacyTransformFindResponseToExternalModel(
  userActions: SavedObjectsFindResponse<CaseUserActionAttributesWithoutConnectorId>,
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
  userAction: SavedObject<CaseUserActionAttributesWithoutConnectorId>,
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
      ...userAction.attributes,
      action_id: userAction.id,
      case_id: caseId,
      comment_id: commentId,
      payload,
    } as CaseUserActionDeprecatedResponse,
  };
}

const addReferenceIdToPayload = (
  userAction: SavedObject<CaseUserActionAttributes>,
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry
): CaseUserActionAttributes['payload'] => {
  const connectorId = getConnectorIdFromReferences(userAction);
  const userActionAttributes = userAction.attributes;

  if (isConnectorUserAction(userActionAttributes) || isCreateCaseUserAction(userActionAttributes)) {
    return {
      ...userActionAttributes.payload,
      connector: {
        ...userActionAttributes.payload.connector,
        id: connectorId ?? NONE_CONNECTOR_ID,
      },
    };
  } else if (isPushedUserAction(userActionAttributes)) {
    return {
      ...userAction.attributes.payload,
      externalService: {
        ...userActionAttributes.payload.externalService,
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
        ...userAction.attributes.payload,
        comment: {
          ...userActionAttributes.payload.comment,
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
        ...userAction.attributes.payload,
        comment: {
          ...userActionAttributes.payload.comment,
          ...injectedAttributes,
        },
      };
    }
  }

  return userAction.attributes.payload;
};

function getConnectorIdFromReferences(
  userAction: SavedObject<CaseUserActionAttributes>
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

function findReferenceId(
  name: string,
  type: string,
  references: SavedObjectReference[]
): string | undefined {
  return references.find((ref) => ref.name === name && ref.type === type)?.id;
}
