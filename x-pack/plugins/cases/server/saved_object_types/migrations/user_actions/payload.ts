/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { isPlainObject, isString } from 'lodash';

import {
  SavedObjectMigrationContext,
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '../../../../../../../src/core/server';
import { Actions, ActionTypes, CommentType, UserActionTypes } from '../../../../common/api';
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

  try {
    const { new_value, old_value, action_field, action_at, action_by, action, ...restAttributes } =
      originalDocWithReferences.attributes;

    const type = getUserActionType(action_field, action);
    const payload = getPayload(type, action_field, new_value, old_value, owner);
    const references = removeOldReferences(doc.references);
    const newAction = action === 'push-to-service' ? Actions.push_to_service : action;

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

    return originalDocWithReferences;
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
  const payload =
    action_field.length > 1
      ? getMultipleFieldsPayload(action_field, new_value ?? old_value ?? null, owner)
      : getSingleFieldPayload(action_field[0], new_value ?? old_value ?? null, owner);

  /**
   * From 7.10+ the cases saved object has the connector attribute
   * Create case user actions did not get migrated to have the
   * connector attribute included.
   *
   * We are taking care of it in this migration by adding the none
   * connector as a default
   */
  const { id, ...noneConnector } = getNoneCaseConnector();
  return {
    ...payload,
    ...(payload.connector == null &&
    (type === ActionTypes.create_case || type === ActionTypes.connector)
      ? { connector: noneConnector }
      : {}),
  };
};

const getMultipleFieldsPayload = (
  fields: string[],
  value: string | null,
  owner: string
): Record<string, unknown> => {
  if (value == null) {
    return {};
  }

  const decodedValue = JSON.parse(value);

  return fields.reduce(
    (payload, field) => ({
      ...payload,
      ...getSingleFieldPayload(field, decodedValue[field], owner),
    }),
    {}
  );
};

const getSingleFieldPayload = (
  field: string,
  value: string | null,
  owner: string
): Record<string, unknown> => {
  const decodeValue = (v: string | null) => {
    try {
      return isString(v) ? JSON.parse(v) : value ?? {};
    } catch {
      return value;
    }
  };

  switch (field) {
    case 'title':
      return { title: value ?? '' };
    case 'tags':
      return { tags: isString(value) ? value.split(',').map((item) => item.trim()) : value ?? [] };
    case 'status':
      return { status: value ?? '' };
    case 'description':
      return { description: value ?? '' };
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
       */
      const decodedValue = decodeValue(value);
      return {
        comment: isPlainObject(decodedValue)
          ? decodedValue
          : { comment: isString(decodedValue) ? decodedValue : '', type: CommentType.user, owner },
      };
    case 'connector':
      return { connector: decodeValue(value) };
    case 'pushed':
      return { externalService: decodeValue(value) };
    case 'settings':
      return { settings: decodeValue(value) };

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
