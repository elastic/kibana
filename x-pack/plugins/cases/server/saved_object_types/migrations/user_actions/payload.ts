/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { isEmpty, isPlainObject, isString } from 'lodash';

import {
  SavedObjectMigrationContext,
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '../../../../../../../src/core/server';
import {
  Actions,
  ActionTypes,
  CaseStatuses,
  CommentType,
  UserActionTypes,
} from '../../../../common/api';
import { USER_ACTION_OLD_ID_REF_NAME, USER_ACTION_OLD_PUSH_ID_REF_NAME } from './constants';
import { getNoneCaseConnector } from '../../../common/utils';
import { logError } from '../utils';
import { UserActions } from './types';

export function payloadMigration(
  doc: SavedObjectUnsanitizedDoc<UserActions>,
  context: SavedObjectMigrationContext
): SavedObjectSanitizedDoc<unknown> {
  const originalDocWithReferences = { ...doc, references: doc.references ?? [] };
  const owner = originalDocWithReferences.attributes.owner;
  const { new_value, old_value, action_field, action_at, action_by, action, ...restAttributes } =
    originalDocWithReferences.attributes;
  const newAction = action === 'push-to-service' ? Actions.push_to_service : action;
  const type = getUserActionType(action_field, action);

  try {
    const payload = getPayload(type, action_field, new_value, old_value, owner);
    const references = removeOldReferences(doc.references);

    return {
      ...originalDocWithReferences,
      attributes: {
        ...restAttributes,
        action: newAction,
        created_at: action_at,
        created_by: action_by,
        payload,
        type,
      },
      references,
    };
  } catch (error) {
    logError({
      id: doc.id,
      context,
      error,
      docType: 'user action',
      docKey: 'userAction',
    });

    return {
      ...originalDocWithReferences,
      attributes: {
        ...restAttributes,
        action: newAction,
        created_at: action_at,
        created_by: action_by,
        payload: {},
        type,
      },
      references: doc.references ?? [],
    };
  }
}

export const getUserActionType = (fields: string[], action: string): string => {
  if (fields.length > 1 && action === Actions.create) {
    return ActionTypes.create_case;
  }

  if (fields.length > 1 && action === Actions.delete) {
    return ActionTypes.delete_case;
  }

  const field = fields[0] as UserActionTypes;
  return ActionTypes[field] ?? '';
};

export const getPayload = (
  type: string,
  action_field: string[],
  new_value: string | null,
  old_value: string | null,
  owner: string
): Record<string, unknown> => {
  const payload = convertPayload(action_field, new_value ?? old_value ?? null, owner);

  /**
   * From 7.10+ the cases saved object has the connector attribute
   * Create case user actions did not get migrated to have the
   * connector attribute included.
   *
   * We are taking care of it in this migration by adding the none
   * connector as a default. The same applies to the status field.
   *
   * If a create_case user action does not have the
   * owner field we default to the owner of the of the
   * user action. It is impossible to create a user action
   * with different owner from the original case.
   */

  const { id, ...noneConnector } = getNoneCaseConnector();
  return {
    ...payload,
    ...(payload.connector == null &&
      (type === ActionTypes.create_case || type === ActionTypes.connector) && {
        connector: noneConnector,
      }),
    ...(isEmpty(payload.status) &&
      type === ActionTypes.create_case && { status: CaseStatuses.open }),
    ...(type === ActionTypes.create_case && isEmpty(payload.owner) && { owner }),
    ...(type === ActionTypes.create_case &&
      isEmpty(payload.settings) && { settings: { syncAlerts: true } }),
  };
};

const convertPayload = (
  fields: string[],
  value: string | null,
  owner: string
): Record<string, unknown> => {
  if (value == null) {
    return {};
  }

  const unsafeDecodedValue = decodeValue(value);

  return fields.reduce(
    (payload, field) => ({
      ...payload,
      ...getSingleFieldPayload(field, unsafeDecodedValue[field] ?? unsafeDecodedValue, owner),
    }),
    {}
  );
};

const decodeValue = (value: string) => {
  try {
    return isString(value) ? JSON.parse(value) : value ?? {};
  } catch {
    return value;
  }
};

const getSingleFieldPayload = (
  field: string,
  value: Record<string, unknown> | string,
  owner: string
): Record<string, unknown> => {
  switch (field) {
    case 'title':
    case 'status':
    case 'description':
      return { [field]: isString(value) ? value : '' };
    case 'owner':
      return { [field]: isString(value) ? value : owner };
    case 'settings':
    case 'connector':
      return { [field]: isPlainObject(value) ? value : {} };
    case 'pushed':
      return { externalService: isPlainObject(value) ? value : {} };
    case 'tags':
      return {
        tags: isString(value)
          ? value.split(',').map((item) => item.trim())
          : Array.isArray(value)
          ? value
          : [],
      };
    case 'comment':
      /**
       * Until 7.10 the new_value of the comment user action
       * was a string. In 7.11+ more fields were introduced to the comment's
       * saved object and the new_value of the user actions changes to an
       * stringify object. At that point of time no migrations were made to
       * the user actions to accommodate the new formatting.
       *
       * We are taking care of it in this migration.
       * If there response of the decodeValue function is not an object
       * then we assume that the value is a string coming for a 7.10
       * user action saved object.
       *
       * Also if the comment does not have an owner we default to the owner
       * of the user action. It is impossible to create a user action
       * with a different owner from the original case.
       */
      return {
        comment: isPlainObject(value)
          ? {
              ...(value as Record<string, unknown>),
              ...((value as Record<string, unknown>).owner == null && { owner }),
            }
          : {
              comment: isString(value) ? value : '',
              type: CommentType.user,
              owner,
            },
      };

    default:
      return {};
  }
};

export const removeOldReferences = (
  references: SavedObjectUnsanitizedDoc<UserActions>['references']
): SavedObjectReference[] =>
  (references ?? []).filter(
    (ref) =>
      ref.name !== USER_ACTION_OLD_ID_REF_NAME && ref.name !== USER_ACTION_OLD_PUSH_ID_REF_NAME
  );
